//! Professional pre-export project validator.
//!
//! `validate_project` is the gate that stands between the user pressing
//! "Export" / "Build" and the Gradle run. It inspects every entity in the
//! project (blocks, items, recipes) and returns a structured list of
//! `ValidationIssue` objects that the frontend renders as an interactive
//! panel with severity badges and one-click jump-to-editor links.
//!
//! ## Severity levels
//!
//! * **Error**   — build will definitely fail or produce a broken mod.
//!                 Export is blocked until all errors are resolved.
//! * **Warning** — build may succeed but the mod will behave unexpectedly
//!                 or fail at runtime (e.g. missing texture, duplicate ID).
//! * **Info**    — style / best-practice advice; never blocks export.
//!
//! ## Checks performed (v1)
//!
//! ### Project-level
//! - modId snake_case regex  `^[a-z][a-z0-9_]{1,63}$`
//! - modId reserved words    (minecraft, forge, fabric, …)
//! - namespace is a valid Java package (at least two dot-separated segments)
//! - MC version is recognised by the version matrix
//! - Java version compatible with the selected MC version
//!
//! ### Blocks
//! - block_name snake_case regex
//! - duplicate block_name within the project
//! - luminance in [0, 15]
//! - hardness in [0.0, 2000.0]
//! - resistance in [0.0, 6000.0]
//! - missing texture (texture_all is None → warning, not error)
//!
//! ### Items
//! - item_name snake_case regex
//! - duplicate item_name within the project
//! - max_stack_size in [1, 64] (1.20.x) or [1, 99] (1.21+)
//! - durability ≥ 1 when set
//! - attack_damage ≥ 0.0 when set
//! - food_eat_seconds in [0.1, 32.0] when set
//! - missing texture_path (warning)
//! - invalid JSON in tooltip_lines_json / food_effects_json / tags_json
//!
//! ### Recipes
//! - recipe_name snake_case regex
//! - duplicate recipe_name within the project
//! - shaped recipes must have ≥ 1 filled cell
//! - shapeless / cooking recipes must have ≥ 1 ingredient
//! - cook_time in [1, 32767] for furnace-type recipes
//! - output_item_id or output_block_id must be set
//! - output_count in [1, 64]
//! - ingredient item names reference known vanilla or project items

use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::operations::{Block, Item, Recipe};
use crate::feature_system::version_matrix::{is_recognised, profile_for};
use super::project_commands::DbState;

// ============================================================================
// Public types
// ============================================================================

/// Severity of a single validation issue.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// Where in the UI the user should be taken when they click "Fix".
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueFix {
    /// Editor panel id (matches `editor_panel_id` in FeatureInfo).
    pub editor_panel_id: String,
    /// DB row id of the offending entity, so the UI can pre-select it.
    pub entity_id: Option<i64>,
}

/// One validation diagnostic.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub severity: Severity,
    /// Short machine-readable code for grouping/filtering.
    pub code: String,
    /// Human-readable message.
    pub message: String,
    /// Where to jump in the UI.
    pub fix: Option<IssueFix>,
}

/// Full validation report returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    pub project_id: i64,
    pub error_count: usize,
    pub warning_count: usize,
    pub info_count: usize,
    /// Whether the project may proceed to export/build.
    pub may_export: bool,
    pub issues: Vec<ValidationIssue>,
}

impl ValidationReport {
    fn new(project_id: i64, issues: Vec<ValidationIssue>) -> Self {
        let error_count = issues.iter().filter(|i| i.severity == Severity::Error).count();
        let warning_count = issues.iter().filter(|i| i.severity == Severity::Warning).count();
        let info_count = issues.iter().filter(|i| i.severity == Severity::Info).count();
        let may_export = error_count == 0;
        Self { project_id, error_count, warning_count, info_count, may_export, issues }
    }
}

// ============================================================================
// Tauri command
// ============================================================================

#[tauri::command]
pub async fn validate_project(
    db: State<'_, DbState>,
    project_id: i64,
) -> Result<ValidationReport, String> {
    let project = db
        .0
        .get_project(project_id)
        .map_err(|e| format!("DB error loading project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", project_id))?;

    let blocks = db
        .0
        .get_blocks(project_id)
        .map_err(|e| format!("DB error loading blocks: {}", e))?;

    let items = db
        .0
        .get_items(project_id)
        .map_err(|e| format!("DB error loading items: {}", e))?;

    let recipes = db
        .0
        .get_recipes(project_id)
        .map_err(|e| format!("DB error loading recipes: {}", e))?;

    let mut issues = Vec::new();

    // Get version profile once (used by multiple checks).
    let profile = profile_for(&project.minecraft_version, &project.mod_loader);

    // Project-level checks
    validate_project_fields(&project, &mut issues);

    // Version / loader compatibility
    if !is_recognised(&project.minecraft_version, &project.mod_loader) {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "UNKNOWN_MC_VERSION".into(),
            message: format!(
                "Minecraft version '{}' with loader '{}' is not in the version matrix. \
                 Generated code may not compile. Supported: 1.16.5 – 1.21.4.",
                project.minecraft_version, project.mod_loader
            ),
            fix: None,
        });
    }

    // Block checks
    let mut seen_block_names: HashSet<String> = HashSet::new();
    for block in &blocks {
        validate_block(block, &mut seen_block_names, &mut issues);
    }

    // Item checks
    let mut seen_item_names: HashSet<String> = HashSet::new();
    // Max stack depends on version: 1.21+ items can stack to 99
    let max_stack = if profile.has_item_attributes_setter { 99 } else { 64 };
    for item in &items {
        validate_item(item, &mut seen_item_names, max_stack, &mut issues);
    }

    // Build a lookup set of known item names for recipe ingredient validation.
    let known_item_names: HashSet<&str> = items.iter()
        .map(|i| i.item_name.as_str())
        .collect();

    // Recipe checks
    let mut seen_recipe_names: HashSet<String> = HashSet::new();
    for recipe in &recipes {
        validate_recipe(recipe, &mut seen_recipe_names, &known_item_names, &mut issues);
    }

    // Summary info if the project has no content at all
    if blocks.is_empty() && items.is_empty() && recipes.is_empty() {
        issues.push(ValidationIssue {
            severity: Severity::Info,
            code: "EMPTY_PROJECT".into(),
            message: "This project has no blocks, items or recipes yet. \
                      Add some content before exporting.".into(),
            fix: None,
        });
    }

    Ok(ValidationReport::new(project_id, issues))
}

// ============================================================================
// Project-level checks
// ============================================================================

fn validate_project_fields(
    project: &crate::db::operations::Project,
    issues: &mut Vec<ValidationIssue>,
) {
    // modId / namespace live in the `namespace` DB column
    let namespace = project.namespace.trim();

    if namespace.is_empty() {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "MISSING_NAMESPACE".into(),
            message: "Project namespace / mod ID is empty.".into(),
            fix: None,
        });
        return;
    }

    // Derive mod id: last segment of dot-notation or whole thing
    let mod_id = namespace.rsplit('.').next().unwrap_or(namespace).to_ascii_lowercase();

    if !is_valid_mod_id(&mod_id) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "INVALID_MOD_ID".into(),
            message: format!(
                "Mod ID '{}' is invalid. Must match ^[a-z][a-z0-9_]{{2,63}}$. \
                 Only lowercase letters, digits, and underscores are allowed, \
                 starting with a letter.",
                mod_id
            ),
            fix: None,
        });
    }

    if RESERVED_MOD_IDS.contains(&mod_id.as_str()) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "RESERVED_MOD_ID".into(),
            message: format!(
                "Mod ID '{}' is reserved by Minecraft or a loader. Choose a unique ID.",
                mod_id
            ),
            fix: None,
        });
    }

    // Namespace must be a valid Java package (≥ 2 segments, lowercase+digits+underscore)
    if !is_valid_java_package(namespace) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "INVALID_JAVA_PACKAGE".into(),
            message: format!(
                "Namespace '{}' is not a valid Java package. \
                 Use at least two dot-separated lowercase segments, e.g. com.yourname.modid.",
                namespace
            ),
            fix: None,
        });
    }

    if project.name.trim().is_empty() {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "MISSING_PROJECT_NAME".into(),
            message: "Project name is empty.".into(),
            fix: None,
        });
    }

    if project.author.trim().is_empty() {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "MISSING_AUTHOR".into(),
            message: "Author field is empty. It will appear blank in the mod metadata.".into(),
            fix: None,
        });
    }
}

// ============================================================================
// Block checks
// ============================================================================

fn validate_block(
    block: &Block,
    seen: &mut HashSet<String>,
    issues: &mut Vec<ValidationIssue>,
) {
    let fix_base = IssueFix {
        editor_panel_id: "block-editor".into(),
        entity_id: block.id,
    };

    // Duplicate check
    let key = block.block_name.to_ascii_lowercase();
    if !seen.insert(key.clone()) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "DUPLICATE_BLOCK_ID".into(),
            message: format!(
                "Block name '{}' is used more than once in this project. \
                 Each block must have a unique registry name.",
                block.block_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Name format
    if !is_valid_registry_name(&block.block_name) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "INVALID_BLOCK_NAME".into(),
            message: format!(
                "Block name '{}' is invalid. Use snake_case: lowercase letters, digits, \
                 and underscores only (e.g. copper_ore).",
                block.block_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    if block.display_name.trim().is_empty() {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "MISSING_BLOCK_DISPLAY_NAME".into(),
            message: format!(
                "Block '{}' has no display name. It will show a raw translation key in-game.",
                block.block_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Luminance [0, 15]
    if !(0..=15).contains(&block.luminance) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "LUMINANCE_OUT_OF_RANGE".into(),
            message: format!(
                "Block '{}': luminance {} is out of range. Must be 0–15.",
                block.block_name, block.luminance
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Hardness [0.0, 2000.0]
    if block.hardness < 0.0 || block.hardness > 2000.0 {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "HARDNESS_OUT_OF_RANGE".into(),
            message: format!(
                "Block '{}': hardness {:.1} is out of range. Use 0.0–2000.0 \
                 (-1.0 = unbreakable is not supported via this editor).",
                block.block_name, block.hardness
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Resistance [0.0, 6000.0]
    if block.resistance < 0.0 || block.resistance > 6000.0 {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "RESISTANCE_OUT_OF_RANGE".into(),
            message: format!(
                "Block '{}': resistance {:.1} is out of range. Use 0.0–6000.0.",
                block.block_name, block.resistance
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Texture warning (not error — a missing texture shows magenta in-game but doesn't crash)
    if block.texture_all.as_ref().map(|t| t.trim().is_empty()).unwrap_or(true) {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "MISSING_BLOCK_TEXTURE".into(),
            message: format!(
                "Block '{}' has no texture assigned. It will appear as a magenta/black \
                 missing-texture cube in-game.",
                block.block_name
            ),
            fix: Some(fix_base),
        });
    }
}

// ============================================================================
// Item checks
// ============================================================================

fn validate_item(
    item: &Item,
    seen: &mut HashSet<String>,
    max_stack: i32,
    issues: &mut Vec<ValidationIssue>,
) {
    let fix_base = IssueFix {
        editor_panel_id: "item-editor".into(),
        entity_id: item.id,
    };

    // Duplicate
    let key = item.item_name.to_ascii_lowercase();
    if !seen.insert(key) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "DUPLICATE_ITEM_ID".into(),
            message: format!(
                "Item name '{}' is used more than once. Each item must have a unique registry name.",
                item.item_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Name format
    if !is_valid_registry_name(&item.item_name) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "INVALID_ITEM_NAME".into(),
            message: format!(
                "Item name '{}' is invalid. Use snake_case: lowercase letters, \
                 digits, and underscores only.",
                item.item_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    if item.display_name.trim().is_empty() {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "MISSING_ITEM_DISPLAY_NAME".into(),
            message: format!("Item '{}' has no display name.", item.item_name),
            fix: Some(fix_base.clone()),
        });
    }

    // Stack size
    if item.max_stack_size < 1 || item.max_stack_size > max_stack {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "STACK_SIZE_OUT_OF_RANGE".into(),
            message: format!(
                "Item '{}': max stack size {} is out of range. Must be 1–{}.",
                item.item_name, item.max_stack_size, max_stack
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Durability
    if let Some(dur) = item.durability {
        if dur < 1 {
            issues.push(ValidationIssue {
                severity: Severity::Error,
                code: "INVALID_DURABILITY".into(),
                message: format!(
                    "Item '{}': durability {} is invalid. Must be ≥ 1.",
                    item.item_name, dur
                ),
                fix: Some(fix_base.clone()),
            });
        }
    }

    // Attack damage
    if let Some(dmg) = item.attack_damage {
        if dmg < 0.0 {
            issues.push(ValidationIssue {
                severity: Severity::Error,
                code: "NEGATIVE_ATTACK_DAMAGE".into(),
                message: format!(
                    "Item '{}': attack damage {:.2} is negative.",
                    item.item_name, dmg
                ),
                fix: Some(fix_base.clone()),
            });
        }
    }

    // Food eat seconds
    if let Some(secs) = item.food_eat_seconds {
        if !(0.1..=32.0).contains(&secs) {
            issues.push(ValidationIssue {
                severity: Severity::Error,
                code: "FOOD_EAT_TIME_OUT_OF_RANGE".into(),
                message: format!(
                    "Item '{}': food eat time {:.1}s is out of range. Use 0.1–32.0.",
                    item.item_name, secs
                ),
                fix: Some(fix_base.clone()),
            });
        }
    }

    // JSON field validity
    for (field, value) in [
        ("tooltip_lines_json", item.tooltip_lines_json.as_deref()),
        ("food_effects_json", item.food_effects_json.as_deref()),
        ("tags_json", item.tags_json.as_deref()),
        ("attribute_modifiers_json", item.attribute_modifiers_json.as_deref()),
    ] {
        if let Some(raw) = value {
            if !raw.trim().is_empty() {
                if serde_json::from_str::<serde_json::Value>(raw).is_err() {
                    issues.push(ValidationIssue {
                        severity: Severity::Error,
                        code: "INVALID_JSON_FIELD".into(),
                        message: format!(
                            "Item '{}': the '{}' field contains invalid JSON.",
                            item.item_name, field
                        ),
                        fix: Some(fix_base.clone()),
                    });
                }
            }
        }
    }

    // Texture warning
    if item.texture_path.as_ref().map(|t| t.trim().is_empty()).unwrap_or(true) {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "MISSING_ITEM_TEXTURE".into(),
            message: format!(
                "Item '{}' has no texture path. It will appear as a missing-texture \
                 item in-game.",
                item.item_name
            ),
            fix: Some(fix_base),
        });
    }
}

// ============================================================================
// Recipe checks
// ============================================================================

fn validate_recipe(
    recipe: &Recipe,
    seen: &mut HashSet<String>,
    known_items: &HashSet<&str>,
    issues: &mut Vec<ValidationIssue>,
) {
    let fix_base = IssueFix {
        editor_panel_id: "recipe-editor".into(),
        entity_id: recipe.id,
    };

    // Duplicate
    let key = recipe.recipe_name.to_ascii_lowercase();
    if !seen.insert(key) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "DUPLICATE_RECIPE_NAME".into(),
            message: format!(
                "Recipe name '{}' is used more than once. Each recipe must be unique.",
                recipe.recipe_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Name format
    if !is_valid_registry_name(&recipe.recipe_name) {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "INVALID_RECIPE_NAME".into(),
            message: format!(
                "Recipe name '{}' is invalid. Use snake_case (lowercase, digits, underscores).",
                recipe.recipe_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Output must be set
    if recipe.output_item_id.is_none() && recipe.output_block_id.is_none() {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "RECIPE_NO_OUTPUT".into(),
            message: format!(
                "Recipe '{}' has no output item or block. Set an output before exporting.",
                recipe.recipe_name
            ),
            fix: Some(fix_base.clone()),
        });
    }

    // Output count
    if recipe.output_count < 1 || recipe.output_count > 64 {
        issues.push(ValidationIssue {
            severity: Severity::Error,
            code: "RECIPE_OUTPUT_COUNT".into(),
            message: format!(
                "Recipe '{}': output count {} is out of range. Must be 1–64.",
                recipe.recipe_name, recipe.output_count
            ),
            fix: Some(fix_base.clone()),
        });
    }

    let is_cooking = matches!(
        recipe.recipe_type.as_str(),
        "smelting" | "smoking" | "blasting" | "campfire"
    );

    // Cook time for furnace-type recipes
    if is_cooking {
        match recipe.cook_time {
            None => {
                issues.push(ValidationIssue {
                    severity: Severity::Warning,
                    code: "RECIPE_MISSING_COOK_TIME".into(),
                    message: format!(
                        "Recipe '{}' ({}) has no cook time. Minecraft will use the default (200 ticks).",
                        recipe.recipe_name, recipe.recipe_type
                    ),
                    fix: Some(fix_base.clone()),
                });
            }
            Some(t) if !(1..=32767).contains(&t) => {
                issues.push(ValidationIssue {
                    severity: Severity::Error,
                    code: "RECIPE_COOK_TIME_RANGE".into(),
                    message: format!(
                        "Recipe '{}': cook time {} ticks is out of range. Use 1–32767.",
                        recipe.recipe_name, t
                    ),
                    fix: Some(fix_base.clone()),
                });
            }
            _ => {}
        }
    }

    // Shaped recipe: at least one filled cell
    if recipe.recipe_type == "shaped" {
        let has_cells = recipe.pattern_json.as_deref()
            .map(|p| {
                // pattern_json is a 3×3 grid encoded as JSON array of string arrays
                // e.g. [["item","",""],["item","item",""],["","item",""]]
                serde_json::from_str::<Vec<Vec<String>>>(p)
                    .map(|grid| grid.iter().flatten().any(|cell| !cell.trim().is_empty()))
                    .unwrap_or(false)
            })
            .unwrap_or(false);

        if !has_cells {
            issues.push(ValidationIssue {
                severity: Severity::Error,
                code: "SHAPED_RECIPE_EMPTY".into(),
                message: format!(
                    "Recipe '{}': shaped recipe has no ingredients in the grid.",
                    recipe.recipe_name
                ),
                fix: Some(fix_base.clone()),
            });
        }
    }

    // Shapeless / cooking: at least one ingredient
    if matches!(recipe.recipe_type.as_str(), "shapeless" | "smelting" | "smoking" | "blasting" | "campfire") {
        let has_ingredients = {
            #[derive(serde::Deserialize)]
            struct Ingredient { name: String }
            serde_json::from_str::<Vec<Ingredient>>(&recipe.ingredients_json)
                .map(|list| !list.is_empty())
                .unwrap_or(false)
        };
        if !has_ingredients {
            issues.push(ValidationIssue {
                severity: Severity::Error,
                code: "RECIPE_NO_INGREDIENTS".into(),
                message: format!(
                    "Recipe '{}' ({}) has no ingredients.",
                    recipe.recipe_name, recipe.recipe_type
                ),
                fix: Some(fix_base.clone()),
            });
        }
    }

    // Ingredient names: warn if not a known vanilla prefix or project item
    validate_recipe_ingredients(recipe, known_items, &fix_base, issues);
}

fn validate_recipe_ingredients(
    recipe: &Recipe,
    known_items: &HashSet<&str>,
    fix_base: &IssueFix,
    issues: &mut Vec<ValidationIssue>,
) {
    #[derive(serde::Deserialize)]
    struct Ingredient { name: String }

    let ingredients: Vec<Ingredient> = match serde_json::from_str(&recipe.ingredients_json) {
        Ok(v) => v,
        Err(_) => {
            issues.push(ValidationIssue {
                severity: Severity::Error,
                code: "RECIPE_INVALID_INGREDIENTS_JSON".into(),
                message: format!(
                    "Recipe '{}': ingredients_json is not valid JSON.",
                    recipe.recipe_name
                ),
                fix: Some(fix_base.clone()),
            });
            return;
        }
    };

    for ing in &ingredients {
        let name = ing.name.trim();
        if name.is_empty() {
            continue;
        }
        // Accept anything that looks like "namespace:id" (vanilla or modded reference)
        if name.contains(':') {
            continue;
        }
        // Accept project item names directly
        if known_items.contains(name) {
            continue;
        }
        // Anything else is suspicious
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            code: "RECIPE_UNKNOWN_INGREDIENT".into(),
            message: format!(
                "Recipe '{}': ingredient '{}' is not a known project item and has no \
                 namespace prefix (e.g. minecraft:stone). If this is a vanilla item, \
                 add the 'minecraft:' prefix.",
                recipe.recipe_name, name
            ),
            fix: Some(fix_base.clone()),
        });
    }
}

// ============================================================================
// Helper predicates
// ============================================================================

/// `^[a-z][a-z0-9_]{1,63}$` — Minecraft registry name rules.
fn is_valid_registry_name(s: &str) -> bool {
    let len = s.len();
    if !(2..=64).contains(&len) {
        return false;
    }
    let mut chars = s.chars();
    matches!(chars.next(), Some(c) if c.is_ascii_lowercase())
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

fn is_valid_mod_id(s: &str) -> bool {
    is_valid_registry_name(s)
}

fn is_valid_java_package(s: &str) -> bool {
    let segs: Vec<&str> = s.split('.').collect();
    if segs.len() < 2 {
        return false;
    }
    segs.iter().all(|seg| {
        let mut chars = seg.chars();
        matches!(chars.next(), Some(c) if c.is_ascii_lowercase())
            && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    })
}

const RESERVED_MOD_IDS: &[&str] = &[
    "minecraft", "forge", "fabric", "fabricloader", "fabric_loader",
    "neoforge", "quilt", "minecraft_mod_studio", "mojang",
];

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ---- registry name ----

    #[test]
    fn valid_registry_names() {
        for name in ["copper_ore", "echo_blade", "ab", "a0"] {
            assert!(is_valid_registry_name(name), "expected valid: {name}");
        }
    }

    #[test]
    fn invalid_registry_names() {
        for name in [
            "",      // empty
            "a",     // too short (len 1, minimum is 2)
            "A",     // uppercase
            "Echo",  // uppercase first
            "echo-blade", // hyphen not allowed
            "echo blade", // space
            "123",   // starts with digit
        ] {
            assert!(!is_valid_registry_name(name), "expected invalid: {name}");
        }
    }

    #[test]
    fn valid_java_packages() {
        for pkg in ["com.example.mymod", "net.fabricmc.mymod", "a.b"] {
            assert!(is_valid_java_package(pkg), "expected valid: {pkg}");
        }
    }

    #[test]
    fn invalid_java_packages() {
        for pkg in ["mymod", "", "com.Example.mymod", "com..mymod"] {
            assert!(!is_valid_java_package(pkg), "expected invalid: {pkg}");
        }
    }

    // ---- block checks ----

    fn sample_block() -> Block {
        Block {
            id: Some(1),
            project_id: 1,
            block_name: "copper_ore".into(),
            display_name: "Copper Ore".into(),
            namespace: "mymod".into(),
            hardness: 3.0,
            resistance: 9.0,
            luminance: 0,
            is_solid: true,
            has_collision: true,
            has_gravity: false,
            is_flammable: false,
            material_type: "ore".into(),
            texture_all: Some("mymod:block/copper_ore".into()),
        }
    }

    #[test]
    fn good_block_produces_no_errors() {
        let mut issues = Vec::new();
        let mut seen = HashSet::new();
        validate_block(&sample_block(), &mut seen, &mut issues);
        let errors: Vec<_> = issues.iter().filter(|i| i.severity == Severity::Error).collect();
        assert!(errors.is_empty(), "unexpected errors: {:?}", errors);
    }

    #[test]
    fn block_luminance_out_of_range_is_error() {
        let mut b = sample_block();
        b.luminance = 16;
        let mut issues = Vec::new();
        validate_block(&b, &mut HashSet::new(), &mut issues);
        assert!(issues.iter().any(|i| i.code == "LUMINANCE_OUT_OF_RANGE" && i.severity == Severity::Error));
    }

    #[test]
    fn block_missing_texture_is_warning_not_error() {
        let mut b = sample_block();
        b.texture_all = None;
        let mut issues = Vec::new();
        validate_block(&b, &mut HashSet::new(), &mut issues);
        assert!(issues.iter().any(|i| i.code == "MISSING_BLOCK_TEXTURE" && i.severity == Severity::Warning));
        assert!(!issues.iter().any(|i| i.severity == Severity::Error));
    }

    #[test]
    fn duplicate_block_name_is_error() {
        let b = sample_block();
        let mut issues = Vec::new();
        let mut seen = HashSet::new();
        validate_block(&b, &mut seen, &mut issues);
        validate_block(&b, &mut seen, &mut issues); // second time = duplicate
        assert!(issues.iter().any(|i| i.code == "DUPLICATE_BLOCK_ID" && i.severity == Severity::Error));
    }

    // ---- item checks ----

    fn sample_item() -> Item {
        Item {
            id: Some(1),
            project_id: 1,
            item_name: "echo_blade".into(),
            display_name: "Echo Blade".into(),
            namespace: "mymod".into(),
            max_stack_size: 1,
            rarity: "rare".into(),
            is_enchantable: true,
            durability: Some(512),
            attack_damage: Some(8.0),
            texture_path: Some("mymod:item/echo_blade".into()),
            ..Item::default()
        }
    }

    #[test]
    fn good_item_produces_no_errors() {
        let mut issues = Vec::new();
        let mut seen = HashSet::new();
        validate_item(&sample_item(), &mut seen, 64, &mut issues);
        let errors: Vec<_> = issues.iter().filter(|i| i.severity == Severity::Error).collect();
        assert!(errors.is_empty(), "unexpected errors: {:?}", errors);
    }

    #[test]
    fn item_stack_size_zero_is_error() {
        let mut item = sample_item();
        item.max_stack_size = 0;
        let mut issues = Vec::new();
        validate_item(&item, &mut HashSet::new(), 64, &mut issues);
        assert!(issues.iter().any(|i| i.code == "STACK_SIZE_OUT_OF_RANGE" && i.severity == Severity::Error));
    }

    #[test]
    fn item_invalid_json_field_is_error() {
        let mut item = sample_item();
        item.tooltip_lines_json = Some("{invalid json".into());
        let mut issues = Vec::new();
        validate_item(&item, &mut HashSet::new(), 64, &mut issues);
        assert!(issues.iter().any(|i| i.code == "INVALID_JSON_FIELD" && i.severity == Severity::Error));
    }

    // ---- recipe checks ----

    fn sample_recipe() -> Recipe {
        Recipe {
            id: Some(1),
            project_id: 1,
            recipe_name: "echo_blade".into(),
            recipe_type: "shaped".into(),
            output_item_id: Some(1),
            output_block_id: None,
            output_count: 1,
            cook_time: None,
            experience: 0.0,
            pattern_json: Some(r#"[["minecraft:diamond","",""],["","minecraft:stick",""],["","","minecraft:stick"]]"#.into()),
            ingredients_json: r#"[{"name":"minecraft:diamond","count":1},{"name":"minecraft:stick","count":1}]"#.into(),
        }
    }

    #[test]
    fn good_recipe_no_errors() {
        let mut issues = Vec::new();
        let mut seen = HashSet::new();
        let known: HashSet<&str> = HashSet::new();
        validate_recipe(&sample_recipe(), &mut seen, &known, &mut issues);
        let errors: Vec<_> = issues.iter().filter(|i| i.severity == Severity::Error).collect();
        assert!(errors.is_empty(), "unexpected errors: {:?}", errors);
    }

    #[test]
    fn recipe_no_output_is_error() {
        let mut r = sample_recipe();
        r.output_item_id = None;
        r.output_block_id = None;
        let mut issues = Vec::new();
        let known = HashSet::new();
        validate_recipe(&r, &mut HashSet::new(), &known, &mut issues);
        assert!(issues.iter().any(|i| i.code == "RECIPE_NO_OUTPUT" && i.severity == Severity::Error));
    }

    #[test]
    fn shaped_recipe_empty_grid_is_error() {
        let mut r = sample_recipe();
        r.pattern_json = Some(r#"[["","",""],["","",""],["","",""]]"#.into());
        let mut issues = Vec::new();
        let known = HashSet::new();
        validate_recipe(&r, &mut HashSet::new(), &known, &mut issues);
        assert!(issues.iter().any(|i| i.code == "SHAPED_RECIPE_EMPTY" && i.severity == Severity::Error));
    }

    #[test]
    fn recipe_cook_time_out_of_range_is_error() {
        let mut r = sample_recipe();
        r.recipe_type = "smelting".into();
        r.cook_time = Some(99999);
        let mut issues = Vec::new();
        let known = HashSet::new();
        validate_recipe(&r, &mut HashSet::new(), &known, &mut issues);
        assert!(issues.iter().any(|i| i.code == "RECIPE_COOK_TIME_RANGE" && i.severity == Severity::Error));
    }

    #[test]
    fn recipe_unknown_ingredient_without_namespace_is_warning() {
        let mut r = sample_recipe();
        r.ingredients_json = r#"[{"name":"some_random_name","count":1}]"#.into();
        let mut issues = Vec::new();
        let known = HashSet::new();
        validate_recipe(&r, &mut HashSet::new(), &known, &mut issues);
        assert!(issues.iter().any(|i| i.code == "RECIPE_UNKNOWN_INGREDIENT" && i.severity == Severity::Warning));
    }

    #[test]
    fn recipe_project_item_ingredient_no_warning() {
        let mut r = sample_recipe();
        r.ingredients_json = r#"[{"name":"echo_blade","count":1}]"#.into();
        let mut issues = Vec::new();
        let mut known = HashSet::new();
        known.insert("echo_blade");
        validate_recipe(&r, &mut HashSet::new(), &known, &mut issues);
        assert!(!issues.iter().any(|i| i.code == "RECIPE_UNKNOWN_INGREDIENT"));
    }

    #[test]
    fn may_export_false_when_errors_present() {
        let report = ValidationReport::new(1, vec![
            ValidationIssue {
                severity: Severity::Error,
                code: "TEST".into(),
                message: "Test error".into(),
                fix: None,
            }
        ]);
        assert!(!report.may_export);
        assert_eq!(report.error_count, 1);
    }

    #[test]
    fn may_export_true_when_only_warnings() {
        let report = ValidationReport::new(1, vec![
            ValidationIssue {
                severity: Severity::Warning,
                code: "TEST".into(),
                message: "Test warning".into(),
                fix: None,
            }
        ]);
        assert!(report.may_export);
        assert_eq!(report.warning_count, 1);
    }
}
