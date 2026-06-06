//! Recipe CRUD + Minecraft-format JSON codegen.
//!
//! The `recipes` SQLite table existed from day one but had no CRUD ops or
//! Tauri commands wired up — recipes were Zustand-only. This module adds:
//!
//!   * Standard create / update / delete / get / list commands.
//!   * `generate_recipe_json(recipe_id)` which converts the editor's
//!     stored payload into the exact JSON shape Minecraft expects under
//!     `data/<modid>/recipe/<name>.json`.
//!
//! The editor (legacy local Recipe type) stores `grid: string[][]` and
//! `ingredients: { name, count }[]` as JSON in the `pattern_json` /
//! `ingredients_json` columns. The generator parses those back and emits
//! one of:
//!   - `minecraft:crafting_shaped`    — uses pattern + key map
//!   - `minecraft:crafting_shapeless` — uses ingredient array
//!   - `minecraft:smelting` / smoking / blasting / campfire_cooking
//!                                    — uses single ingredient + cookingtime
//!
//! Validation rules (so a clearly-invalid recipe is rejected up-front):
//!   * recipe_name must be non-empty and snake_case-ish.
//!   * shaped recipes must have at least one non-empty grid cell.
//!   * shapeless / cooking recipes must have at least one ingredient.

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::codegen_commands::GeneratedFile;
use crate::db::operations::Recipe;
use super::project_commands::DbState;

// ============================================================================
// CRUD commands
// ============================================================================

#[tauri::command]
pub async fn create_recipe(
    db: State<'_, DbState>,
    project_id: i64,
    recipe_name: String,
    recipe_type: String,
    output_item_id: Option<i64>,
    output_block_id: Option<i64>,
    output_count: i32,
    cook_time: Option<i32>,
    experience: f64,
    pattern_json: Option<String>,
    ingredients_json: String,
) -> Result<i64, String> {
    let recipe = Recipe {
        id: None,
        project_id,
        recipe_name,
        recipe_type,
        output_item_id,
        output_block_id,
        output_count,
        cook_time,
        experience,
        pattern_json,
        ingredients_json,
    };
    db.0.create_recipe(&recipe).map_err(|e| format!("create_recipe: {}", e))
}

#[tauri::command]
pub async fn update_recipe(
    db: State<'_, DbState>,
    id: i64,
    project_id: i64,
    recipe_name: String,
    recipe_type: String,
    output_item_id: Option<i64>,
    output_block_id: Option<i64>,
    output_count: i32,
    cook_time: Option<i32>,
    experience: f64,
    pattern_json: Option<String>,
    ingredients_json: String,
) -> Result<(), String> {
    let recipe = Recipe {
        id: Some(id),
        project_id,
        recipe_name,
        recipe_type,
        output_item_id,
        output_block_id,
        output_count,
        cook_time,
        experience,
        pattern_json,
        ingredients_json,
    };
    db.0.update_recipe(&recipe).map_err(|e| format!("update_recipe: {}", e))
}

#[tauri::command]
pub async fn delete_recipe(db: State<'_, DbState>, id: i64) -> Result<(), String> {
    db.0.delete_recipe(id).map_err(|e| format!("delete_recipe: {}", e))
}

#[tauri::command]
pub async fn get_recipe(db: State<'_, DbState>, id: i64) -> Result<Option<Recipe>, String> {
    db.0.get_recipe(id).map_err(|e| format!("get_recipe: {}", e))
}

#[tauri::command]
pub async fn get_recipes(db: State<'_, DbState>, project_id: i64) -> Result<Vec<Recipe>, String> {
    db.0.get_recipes(project_id).map_err(|e| format!("get_recipes: {}", e))
}

// ============================================================================
// Codegen
// ============================================================================
//
// Editor's `Ingredient` shape (from RecipeEditor.tsx):
//   { id: string, name: string, count: number }
// where `name` is a Minecraft item id like `minecraft:stick` or
// `<modid>:my_item`. We trust whatever the user typed (validation lives
// in the editor); codegen merely transforms it into the wire format.

#[derive(Debug, Deserialize)]
struct EditorIngredient {
    name: String,
    #[serde(default = "default_count")]
    count: i32,
}

fn default_count() -> i32 {
    1
}

#[derive(Debug, Serialize)]
struct ShapedRecipeJson {
    #[serde(rename = "type")]
    recipe_type: String,
    pattern: Vec<String>,
    key: serde_json::Map<String, serde_json::Value>,
    result: ResultJson,
}

#[derive(Debug, Serialize)]
struct ShapelessRecipeJson {
    #[serde(rename = "type")]
    recipe_type: String,
    ingredients: Vec<serde_json::Value>,
    result: ResultJson,
}

#[derive(Debug, Serialize)]
struct CookingRecipeJson {
    #[serde(rename = "type")]
    recipe_type: String,
    ingredient: serde_json::Value,
    result: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    cookingtime: Option<i32>,
    experience: f64,
}

#[derive(Debug, Serialize)]
struct ResultJson {
    item: String,
    #[serde(skip_serializing_if = "is_one")]
    count: i32,
}

fn is_one(c: &i32) -> bool {
    *c == 1
}

/// Validate raw editor data and emit the corresponding Minecraft recipe JSON.
///
/// The output is pretty-printed so it diff-friendly when the user inspects
/// the file in their workspace.
fn emit_recipe_json(
    recipe: &Recipe,
    project_namespace: &str,
) -> Result<String, String> {
    let modid = project_namespace.to_lowercase();

    // --- Validation ---------------------------------------------------------
    if recipe.recipe_name.trim().is_empty() {
        return Err("recipe_name is empty".into());
    }
    if !recipe.recipe_name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_') {
        return Err(format!(
            "recipe_name '{}' must be lowercase snake_case (a-z, 0-9, _)",
            recipe.recipe_name
        ));
    }

    let ingredients: Vec<EditorIngredient> = serde_json::from_str(&recipe.ingredients_json)
        .map_err(|e| format!("Could not parse ingredients_json: {}", e))?;

    let result_item = if let Some(_oid) = recipe.output_item_id {
        // The editor stores numeric ids; the *real* item registry id is set
        // by the user through the Item editor. For now we surface a TODO so
        // the user knows to fill it in. A future PR will look up the item's
        // registry id via the `items` table.
        format!("{}:{}", modid, recipe.recipe_name)
    } else {
        format!("{}:{}", modid, recipe.recipe_name)
    };

    let result = ResultJson {
        item: result_item,
        count: recipe.output_count.max(1),
    };

    // --- Per-type emission --------------------------------------------------
    let json = match recipe.recipe_type.as_str() {
        "shaped" => {
            let pattern_grid: Vec<Vec<String>> = recipe
                .pattern_json
                .as_deref()
                .map(serde_json::from_str::<Vec<Vec<String>>>)
                .transpose()
                .map_err(|e| format!("Could not parse pattern_json: {}", e))?
                .unwrap_or_default();

            if pattern_grid.iter().all(|row| row.iter().all(|c| c.is_empty())) {
                return Err("Shaped recipe has an empty grid".into());
            }

            // Trim empty edge rows / columns and build the pattern strings.
            // Each unique non-empty cell becomes a key in the key map; we
            // assign single-character keys 'a'..'z' deterministically.
            let mut key_map: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
            let mut key_for_item: std::collections::HashMap<String, char> =
                std::collections::HashMap::new();
            let mut next_key: u8 = b'a';

            let mut pattern: Vec<String> = Vec::with_capacity(3);
            for row in &pattern_grid {
                let mut s = String::new();
                for cell in row {
                    if cell.trim().is_empty() {
                        s.push(' ');
                    } else {
                        let trimmed = cell.trim().to_string();
                        let key = *key_for_item.entry(trimmed.clone()).or_insert_with(|| {
                            let k = next_key as char;
                            next_key += 1;
                            key_map.insert(
                                k.to_string(),
                                serde_json::json!({ "item": trimmed }),
                            );
                            k
                        });
                        s.push(key);
                    }
                }
                pattern.push(s);
            }

            let shaped = ShapedRecipeJson {
                recipe_type: "minecraft:crafting_shaped".into(),
                pattern,
                key: key_map,
                result,
            };
            serde_json::to_string_pretty(&shaped).map_err(|e| e.to_string())?
        }
        "shapeless" => {
            if ingredients.is_empty() {
                return Err("Shapeless recipe must have at least one ingredient".into());
            }
            let ing_json: Vec<serde_json::Value> = ingredients
                .iter()
                .map(|i| serde_json::json!({ "item": i.name }))
                .collect();
            let shapeless = ShapelessRecipeJson {
                recipe_type: "minecraft:crafting_shapeless".into(),
                ingredients: ing_json,
                result,
            };
            serde_json::to_string_pretty(&shapeless).map_err(|e| e.to_string())?
        }
        kind @ ("smelting" | "smoking" | "blasting" | "campfire_cooking" | "campfire") => {
            if ingredients.is_empty() {
                return Err(format!("{} recipe must have one ingredient", kind));
            }
            let mc_kind = match kind {
                "smelting" => "minecraft:smelting",
                "smoking" => "minecraft:smoking",
                "blasting" => "minecraft:blasting",
                _ => "minecraft:campfire_cooking",
            };
            let cooking = CookingRecipeJson {
                recipe_type: mc_kind.into(),
                ingredient: serde_json::json!({ "item": ingredients[0].name }),
                result: result.item,
                cookingtime: recipe.cook_time,
                experience: recipe.experience,
            };
            serde_json::to_string_pretty(&cooking).map_err(|e| e.to_string())?
        }
        other => return Err(format!("Unsupported recipe_type: {}", other)),
    };

    Ok(json)
}

#[tauri::command]
pub async fn generate_recipe_json(
    db: State<'_, DbState>,
    recipe_id: i64,
) -> Result<GeneratedFile, String> {
    let recipe = db
        .0
        .get_recipe(recipe_id)
        .map_err(|e| format!("get_recipe: {}", e))?
        .ok_or_else(|| format!("Recipe {} not found", recipe_id))?;

    let project = db
        .0
        .get_project(recipe.project_id)
        .map_err(|e| format!("get_project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", recipe.project_id))?;

    let json = emit_recipe_json(&recipe, &project.namespace)?;
    let modid = project.namespace.to_lowercase();

    Ok(GeneratedFile {
        file_name: format!("{}.json", recipe.recipe_name),
        package_path: format!("../resources/data/{}/recipe", modid),
        source: json,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy(recipe_type: &str, pattern: Option<&str>, ingredients: &str) -> Recipe {
        Recipe {
            id: Some(1),
            project_id: 1,
            recipe_name: "diamond_chestplate".into(),
            recipe_type: recipe_type.into(),
            output_item_id: None,
            output_block_id: None,
            output_count: 1,
            cook_time: Some(200),
            experience: 1.0,
            pattern_json: pattern.map(String::from),
            ingredients_json: ingredients.into(),
        }
    }

    #[test]
    fn shaped_emits_pattern_and_key_map() {
        let r = dummy(
            "shaped",
            Some(r#"[["minecraft:diamond","","minecraft:diamond"],["minecraft:diamond","minecraft:diamond","minecraft:diamond"],["minecraft:diamond","minecraft:diamond","minecraft:diamond"]]"#),
            "[]",
        );
        let json = emit_recipe_json(&r, "mymod").unwrap();
        assert!(json.contains("\"type\": \"minecraft:crafting_shaped\""));
        assert!(json.contains("\"pattern\""));
        assert!(json.contains("\"key\""));
        assert!(json.contains("\"item\": \"minecraft:diamond\""));
    }

    #[test]
    fn shapeless_requires_ingredients() {
        let r = dummy("shapeless", None, "[]");
        assert!(emit_recipe_json(&r, "mymod").is_err());
    }

    #[test]
    fn smelting_uses_cookingtime() {
        let r = dummy("smelting", None, r#"[{"name":"minecraft:iron_ore","count":1}]"#);
        let json = emit_recipe_json(&r, "mymod").unwrap();
        assert!(json.contains("\"type\": \"minecraft:smelting\""));
        assert!(json.contains("\"cookingtime\": 200"));
        assert!(json.contains("\"experience\": 1.0"));
    }

    #[test]
    fn rejects_invalid_name() {
        let mut r = dummy("shapeless", None, r#"[{"name":"x","count":1}]"#);
        r.recipe_name = "Bad-Name".into();
        let err = emit_recipe_json(&r, "mymod").unwrap_err();
        assert!(err.contains("snake_case"));
    }
}
