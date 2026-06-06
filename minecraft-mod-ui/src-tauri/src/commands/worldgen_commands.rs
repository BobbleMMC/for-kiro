//! Worldgen feature commands — promotes the WorldgenFeature row in the
//! Feature Catalog from Skeleton to Complete.
//!
//! Adding a worldgen feature to a mod requires **three** pieces of data
//! shipped together (or four, on Forge / NeoForge that need a biome
//! modifier file too). The studio used to emit only a placeholder; this
//! module generates all of them in one go:
//!
//!   1. `data/<modid>/worldgen/configured_feature/<name>.json` —
//!      describes what to spawn (ore vein / tree / lake / disk / spring).
//!   2. `data/<modid>/worldgen/placed_feature/<name>.json` —
//!      describes how often / where to spawn it (placement modifiers).
//!   3. **Forge only:** `data/<modid>/forge/biome_modifier/add_<name>.json`
//!      — wires the placed feature into matching biomes.
//!   4. **NeoForge only:** `data/<modid>/neoforge/biome_modifier/add_<name>.json`
//!      — same but using the NeoForge codec name.
//!
//! On Fabric there is no datapack-level biome modifier; users must use
//! the `BiomeModifications` API in code, so we emit a Java helper class
//! instead of a JSON biome modifier.
//!
//! All four feature kinds (`ore`, `tree`, `lake`, `disk`, `spring`,
//! `scattered_ore`) share the same outer JSON shape and differ only in
//! the `feature` and `config` slots. A single `WorldgenMeta` struct
//! drives them via a `kind` discriminator.

use serde::Deserialize;
use tauri::State;

use crate::commands::codegen_commands::GeneratedFile;
use crate::feature_system::version_matrix::{profile_for, LoaderId};
use super::project_commands::DbState;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorldgenKind {
    Ore,
    ScatteredOre,
    Tree,
    Lake,
    Spring,
    Disk,
}

impl WorldgenKind {
    fn slug(&self) -> &'static str {
        match self {
            WorldgenKind::Ore => "ore",
            WorldgenKind::ScatteredOre => "scattered_ore",
            WorldgenKind::Tree => "tree",
            WorldgenKind::Lake => "lake",
            WorldgenKind::Spring => "spring",
            WorldgenKind::Disk => "disk",
        }
    }
    fn from_str(s: &str) -> Option<WorldgenKind> {
        match s.trim().to_ascii_lowercase().as_str() {
            "ore" => Some(WorldgenKind::Ore),
            "scattered_ore" => Some(WorldgenKind::ScatteredOre),
            "tree" => Some(WorldgenKind::Tree),
            "lake" => Some(WorldgenKind::Lake),
            "spring" => Some(WorldgenKind::Spring),
            "disk" => Some(WorldgenKind::Disk),
            _ => None,
        }
    }
}

/// Persisted Worldgen metadata. Matches the `metadata` JSON the React
/// editor saves via `save_asset(asset_type = "worldgen_feature")`.
///
/// The shape covers every feature kind via a discriminator. Fields
/// outside the active kind are silently ignored.
#[derive(Debug, Default, Deserialize)]
pub struct WorldgenMeta {
    /// What kind of feature to emit.
    #[serde(default = "default_kind_str")]
    pub kind: String,

    // ---- Common (ore / scattered_ore) ----
    /// Block to place. e.g. "minecraft:stone" or "<modid>:ruby_ore".
    #[serde(default)]
    pub target_block: String,
    /// Block to replace. e.g. "minecraft:stone" / `#minecraft:stone_ore_replaceables`.
    #[serde(default = "default_replace")]
    pub replace_target: String,
    /// Vein size 1..=64.
    #[serde(default = "default_vein_size")]
    pub vein_size: i32,
    /// Air-exposure discard chance 0..=1.
    #[serde(default)]
    pub discard_chance_on_air_exposure: f64,

    // ---- Placement ----
    /// Number of attempts per chunk. 1..=128.
    #[serde(default = "default_count")]
    pub count: i32,
    /// Min height (uniform) in blocks.
    #[serde(default = "default_min_y")]
    pub min_y: i32,
    /// Max height (uniform) in blocks.
    #[serde(default = "default_max_y")]
    pub max_y: i32,
    /// Apply rarity_filter (1 in N chunks).
    #[serde(default)]
    pub rarity: i32,

    // ---- Biome modifier ----
    /// `#tag` or single biome id. Forge / NeoForge biome_modifier reads this.
    #[serde(default = "default_biome_tag")]
    pub biome_tag: String,
    /// Generation step. e.g. "underground_ores" / "vegetal_decoration" / "lakes".
    #[serde(default = "default_step")]
    pub generation_step: String,

    // ---- Tree-specific ----
    #[serde(default = "default_log")]
    pub trunk_block: String,
    #[serde(default = "default_leaves")]
    pub leaves_block: String,
    #[serde(default = "default_trunk_height")]
    pub trunk_height: i32,
    #[serde(default = "default_foliage_radius")]
    pub foliage_radius: i32,

    // ---- Lake / Spring / Disk ----
    /// Fluid for lake/spring. e.g. "minecraft:water" / "minecraft:lava".
    #[serde(default = "default_fluid")]
    pub fluid: String,
    /// Disk radius (disk feature).
    #[serde(default = "default_disk_radius")]
    pub disk_radius: i32,
}

fn default_kind_str() -> String {
    "ore".into()
}
fn default_replace() -> String {
    "#minecraft:stone_ore_replaceables".into()
}
fn default_vein_size() -> i32 {
    8
}
fn default_count() -> i32 {
    8
}
fn default_min_y() -> i32 {
    -64
}
fn default_max_y() -> i32 {
    64
}
fn default_biome_tag() -> String {
    "#minecraft:is_overworld".into()
}
fn default_step() -> String {
    "underground_ores".into()
}
fn default_log() -> String {
    "minecraft:oak_log".into()
}
fn default_leaves() -> String {
    "minecraft:oak_leaves".into()
}
fn default_trunk_height() -> i32 {
    5
}
fn default_foliage_radius() -> i32 {
    2
}
fn default_fluid() -> String {
    "minecraft:water".into()
}
fn default_disk_radius() -> i32 {
    3
}

fn validate(meta: &WorldgenMeta, kind: WorldgenKind) -> Result<(), String> {
    let needs_target =
        matches!(kind, WorldgenKind::Ore | WorldgenKind::ScatteredOre | WorldgenKind::Disk);
    if needs_target && meta.target_block.trim().is_empty() {
        return Err(format!(
            "Worldgen kind '{}' requires `target_block` (e.g. \"minecraft:stone\")",
            kind.slug()
        ));
    }
    if !(1..=64).contains(&meta.vein_size) {
        return Err(format!(
            "vein_size must be 1..=64, got {}",
            meta.vein_size
        ));
    }
    if !(1..=128).contains(&meta.count) {
        return Err(format!("count must be 1..=128, got {}", meta.count));
    }
    if meta.min_y >= meta.max_y {
        return Err(format!(
            "min_y ({}) must be < max_y ({})",
            meta.min_y, meta.max_y
        ));
    }
    if !(0.0..=1.0).contains(&meta.discard_chance_on_air_exposure) {
        return Err(format!(
            "discard_chance_on_air_exposure must be 0..=1, got {}",
            meta.discard_chance_on_air_exposure
        ));
    }
    if meta.rarity < 0 {
        return Err("rarity must be >= 0".into());
    }
    if matches!(kind, WorldgenKind::Tree) {
        if meta.trunk_height < 1 || meta.trunk_height > 32 {
            return Err(format!(
                "trunk_height must be 1..=32, got {}",
                meta.trunk_height
            ));
        }
        if meta.foliage_radius < 0 || meta.foliage_radius > 8 {
            return Err(format!(
                "foliage_radius must be 0..=8, got {}",
                meta.foliage_radius
            ));
        }
    }
    if matches!(kind, WorldgenKind::Disk) && (meta.disk_radius < 1 || meta.disk_radius > 8) {
        return Err(format!(
            "disk_radius must be 1..=8, got {}",
            meta.disk_radius
        ));
    }
    Ok(())
}

// ============================================================================
// JSON shapes
// ============================================================================

fn configured_feature_json(
    asset_name: &str,
    namespace: &str,
    kind: WorldgenKind,
    meta: &WorldgenMeta,
) -> serde_json::Value {
    use serde_json::json;
    let modid = namespace.to_lowercase();
    let id = format!("{}:{}", modid, asset_name);

    match kind {
        WorldgenKind::Ore => json!({
            "_id": id,
            "type": "minecraft:ore",
            "config": {
                "size": meta.vein_size,
                "discard_chance_on_air_exposure": meta.discard_chance_on_air_exposure,
                "targets": [
                    {
                        "target": { "predicate_type": "minecraft:tag_match", "tag": meta.replace_target.trim_start_matches('#') },
                        "state": { "Name": meta.target_block }
                    }
                ]
            }
        }),
        WorldgenKind::ScatteredOre => json!({
            "_id": id,
            "type": "minecraft:scattered_ore",
            "config": {
                "size": meta.vein_size,
                "discard_chance_on_air_exposure": meta.discard_chance_on_air_exposure,
                "targets": [
                    {
                        "target": { "predicate_type": "minecraft:tag_match", "tag": meta.replace_target.trim_start_matches('#') },
                        "state": { "Name": meta.target_block }
                    }
                ]
            }
        }),
        WorldgenKind::Tree => json!({
            "_id": id,
            "type": "minecraft:tree",
            "config": {
                "trunk_provider": { "type": "minecraft:simple_state_provider", "state": { "Name": meta.trunk_block } },
                "trunk_placer": {
                    "type": "minecraft:straight_trunk_placer",
                    "base_height": meta.trunk_height,
                    "height_rand_a": 1,
                    "height_rand_b": 1
                },
                "foliage_provider": { "type": "minecraft:simple_state_provider", "state": { "Name": meta.leaves_block } },
                "foliage_placer": {
                    "type": "minecraft:blob_foliage_placer",
                    "radius": meta.foliage_radius,
                    "offset": 0,
                    "height": 3
                },
                "minimum_size": { "type": "minecraft:two_layers_feature_size", "limit": 1, "lower_size": 0, "upper_size": 1 },
                "ignore_vines": true,
                "force_dirt": false,
                "dirt_provider": { "type": "minecraft:simple_state_provider", "state": { "Name": "minecraft:dirt" } }
            }
        }),
        WorldgenKind::Lake => json!({
            "_id": id,
            "type": "minecraft:lake",
            "config": {
                "fluid": { "type": "minecraft:simple_state_provider", "state": { "Name": meta.fluid } },
                "barrier": { "type": "minecraft:simple_state_provider", "state": { "Name": "minecraft:stone" } }
            }
        }),
        WorldgenKind::Spring => json!({
            "_id": id,
            "type": "minecraft:spring_feature",
            "config": {
                "state": { "Name": meta.fluid },
                "valid_blocks": "#minecraft:base_stone_overworld",
                "rock_count": 4,
                "hole_count": 1,
                "requires_block_below": true
            }
        }),
        WorldgenKind::Disk => json!({
            "_id": id,
            "type": "minecraft:disk",
            "config": {
                "state_provider": { "type": "minecraft:simple_state_provider", "state": { "Name": meta.target_block } },
                "target": "#minecraft:dirt",
                "radius": { "type": "minecraft:uniform", "value": { "min_inclusive": meta.disk_radius - 1, "max_inclusive": meta.disk_radius } },
                "half_height": 1
            }
        }),
    }
}

fn placed_feature_json(
    asset_name: &str,
    namespace: &str,
    meta: &WorldgenMeta,
) -> serde_json::Value {
    use serde_json::json;
    let modid = namespace.to_lowercase();

    let mut placement: Vec<serde_json::Value> = Vec::new();

    placement.push(json!({
        "type": "minecraft:count",
        "count": meta.count
    }));
    if meta.rarity > 1 {
        placement.push(json!({
            "type": "minecraft:rarity_filter",
            "chance": meta.rarity
        }));
    }
    placement.push(json!({ "type": "minecraft:in_square" }));
    placement.push(json!({
        "type": "minecraft:height_range",
        "height": {
            "type": "minecraft:uniform",
            "min_inclusive": { "absolute": meta.min_y },
            "max_inclusive": { "absolute": meta.max_y }
        }
    }));
    placement.push(json!({ "type": "minecraft:biome" }));

    json!({
        "feature": format!("{}:{}", modid, asset_name),
        "placement": placement
    })
}

fn forge_biome_modifier_json(
    asset_name: &str,
    namespace: &str,
    meta: &WorldgenMeta,
    loader: LoaderId,
) -> serde_json::Value {
    use serde_json::json;
    let modid = namespace.to_lowercase();
    let codec_type = match loader {
        LoaderId::NeoForge => "neoforge:add_features",
        _ => "forge:add_features",
    };
    json!({
        "_comment": format!(
            "Generated by Minecraft Mod Studio. Adds {modid}:{asset_name} to biomes \
             matching {tag} during step '{step}'.",
            modid = modid,
            asset_name = asset_name,
            tag = meta.biome_tag,
            step = meta.generation_step,
        ),
        "type": codec_type,
        "biomes": meta.biome_tag,
        "features": format!("{}:{}", modid, asset_name),
        "step": meta.generation_step
    })
}

fn fabric_biome_helper_java(
    asset_name: &str,
    namespace: &str,
    meta: &WorldgenMeta,
) -> String {
    let modid = namespace.to_lowercase();
    let class_name = pascal(&format!("Add{}Feature", asset_name));
    let pkg = if namespace.contains('.') {
        format!("{}.worldgen", namespace)
    } else {
        format!("com.modstudio.{}.worldgen", namespace)
    };

    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Fabric biome modifier helper\n\
         //  asset = {modid}:{asset_name} · step = {step} · biomes = {tag}\n\
         //\n\
         //  On Fabric there is no datapack-level biome_modifier file. Use the\n\
         //  BiomeModifications API in code instead. Call this register() helper\n\
         //  from your ModInitializer.onInitialize().\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         import net.fabricmc.fabric.api.biome.v1.BiomeModifications;\n\
         import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;\n\
         import net.minecraft.core.registries.Registries;\n\
         import net.minecraft.resources.ResourceKey;\n\
         import net.minecraft.resources.ResourceLocation;\n\
         import net.minecraft.world.level.levelgen.GenerationStep;\n\
         import net.minecraft.world.level.levelgen.placement.PlacedFeature;\n\n\
         public final class {class} {{\n\
         \x20   private static final ResourceKey<PlacedFeature> KEY = ResourceKey.create(\n\
         \x20       Registries.PLACED_FEATURE,\n\
         \x20       new ResourceLocation(\"{modid}\", \"{asset_name}\")\n\
         \x20   );\n\n\
         \x20   public static void register() {{\n\
         \x20       BiomeModifications.addFeature(\n\
         \x20           BiomeSelectors.tag(net.minecraft.tags.BiomeTags.IS_OVERWORLD), // TODO: derive from {tag}\n\
         \x20           GenerationStep.Decoration.{step_enum},\n\
         \x20           KEY\n\
         \x20       );\n\
         \x20   }}\n\
         \x20   private {class}() {{}}\n\
         }}\n",
        modid = modid,
        asset_name = asset_name,
        step = meta.generation_step,
        tag = meta.biome_tag,
        pkg = pkg,
        class = class_name,
        step_enum = step_enum_for(&meta.generation_step),
    )
}

fn step_enum_for(step: &str) -> &'static str {
    match step.to_ascii_lowercase().as_str() {
        "raw_generation" => "RAW_GENERATION",
        "lakes" => "LAKES",
        "local_modifications" => "LOCAL_MODIFICATIONS",
        "underground_structures" => "UNDERGROUND_STRUCTURES",
        "surface_structures" => "SURFACE_STRUCTURES",
        "strongholds" => "STRONGHOLDS",
        "underground_ores" => "UNDERGROUND_ORES",
        "underground_decoration" => "UNDERGROUND_DECORATION",
        "fluid_springs" => "FLUID_SPRINGS",
        "vegetal_decoration" => "VEGETAL_DECORATION",
        "top_layer_modification" => "TOP_LAYER_MODIFICATION",
        _ => "VEGETAL_DECORATION",
    }
}

fn pascal(s: &str) -> String {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|p| !p.is_empty())
        .map(|p| {
            let mut chars = p.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

// ============================================================================
// Tauri command — emits Vec<GeneratedFile>
// ============================================================================

/// Generate every JSON / Java file required to ship a worldgen feature.
///
/// Returns at least 2 files (configured_feature + placed_feature), plus
/// 1 biome-modifier JSON on Forge / NeoForge or 1 Java helper class on
/// Fabric. The frontend modal renders each file in its own tab and the
/// "Write to project" button writes the whole bundle.
#[tauri::command]
pub async fn generate_worldgen_feature(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<Vec<GeneratedFile>, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;

    if asset.asset_type != "worldgen_feature" {
        return Err(format!(
            "Asset {} is not a worldgen_feature (got '{}')",
            asset_id, asset.asset_type
        ));
    }
    if !asset
        .asset_name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    {
        return Err(format!(
            "Worldgen asset_name '{}' must match ^[a-z0-9_]+$",
            asset.asset_name
        ));
    }

    let project = db
        .0
        .get_project(asset.project_id)
        .map_err(|e| format!("get_project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", asset.project_id))?;

    let meta: WorldgenMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse worldgen metadata: {}", e))?
        .unwrap_or_default();

    let kind = WorldgenKind::from_str(&meta.kind).ok_or_else(|| {
        format!(
            "Worldgen kind '{}' is not one of ore/scattered_ore/tree/lake/spring/disk",
            meta.kind
        )
    })?;
    validate(&meta, kind)?;

    let modid = asset.namespace.to_lowercase();
    let mut out = Vec::new();

    // 1. configured_feature
    let cf = configured_feature_json(&asset.asset_name, &asset.namespace, kind, &meta);
    out.push(GeneratedFile {
        file_name: format!("{}.json", asset.asset_name),
        package_path: format!("../resources/data/{}/worldgen/configured_feature", modid),
        source: serde_json::to_string_pretty(&cf).map_err(|e| e.to_string())?,
    });

    // 2. placed_feature
    let pf = placed_feature_json(&asset.asset_name, &asset.namespace, &meta);
    out.push(GeneratedFile {
        file_name: format!("{}.json", asset.asset_name),
        package_path: format!("../resources/data/{}/worldgen/placed_feature", modid),
        source: serde_json::to_string_pretty(&pf).map_err(|e| e.to_string())?,
    });

    // 3. biome modifier OR Fabric Java helper
    let profile = profile_for(&project.minecraft_version, &project.mod_loader);
    match profile.loader {
        LoaderId::Forge => {
            let bm = forge_biome_modifier_json(
                &asset.asset_name,
                &asset.namespace,
                &meta,
                LoaderId::Forge,
            );
            out.push(GeneratedFile {
                file_name: format!("add_{}.json", asset.asset_name),
                package_path: format!("../resources/data/{}/forge/biome_modifier", modid),
                source: serde_json::to_string_pretty(&bm).map_err(|e| e.to_string())?,
            });
        }
        LoaderId::NeoForge => {
            let bm = forge_biome_modifier_json(
                &asset.asset_name,
                &asset.namespace,
                &meta,
                LoaderId::NeoForge,
            );
            out.push(GeneratedFile {
                file_name: format!("add_{}.json", asset.asset_name),
                package_path: format!("../resources/data/{}/neoforge/biome_modifier", modid),
                source: serde_json::to_string_pretty(&bm).map_err(|e| e.to_string())?,
            });
        }
        LoaderId::Fabric | LoaderId::Quilt => {
            let java = fabric_biome_helper_java(&asset.asset_name, &asset.namespace, &meta);
            let class_name = pascal(&format!("Add{}Feature", asset.asset_name));
            let pkg = if asset.namespace.contains('.') {
                format!("{}.worldgen", asset.namespace)
            } else {
                format!("com.modstudio.{}.worldgen", asset.namespace.to_lowercase())
            };
            out.push(GeneratedFile {
                file_name: format!("{}.java", class_name),
                package_path: pkg.replace('.', "/"),
                source: java,
            });
        }
    }

    Ok(out)
}

// ----- (no aliases needed) -----

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn worldgen_kind_round_trip() {
        for k in [
            WorldgenKind::Ore,
            WorldgenKind::ScatteredOre,
            WorldgenKind::Tree,
            WorldgenKind::Lake,
            WorldgenKind::Spring,
            WorldgenKind::Disk,
        ] {
            assert_eq!(WorldgenKind::from_str(k.slug()), Some(k));
        }
        assert!(WorldgenKind::from_str("village").is_none());
    }

    #[test]
    fn validate_ore_requires_target_block() {
        let mut meta = WorldgenMeta::default();
        meta.kind = "ore".into();
        meta.target_block = "".into();
        assert!(validate(&meta, WorldgenKind::Ore).is_err());

        meta.target_block = "minecraft:diamond_ore".into();
        assert!(validate(&meta, WorldgenKind::Ore).is_ok());
    }

    #[test]
    fn validate_rejects_bad_vein_size_and_count() {
        let mut meta = WorldgenMeta::default();
        meta.target_block = "minecraft:stone".into();
        meta.vein_size = 0;
        assert!(validate(&meta, WorldgenKind::Ore).is_err());
        meta.vein_size = 64;
        assert!(validate(&meta, WorldgenKind::Ore).is_ok());
        meta.vein_size = 65;
        assert!(validate(&meta, WorldgenKind::Ore).is_err());

        meta.vein_size = 8;
        meta.count = 200;
        assert!(validate(&meta, WorldgenKind::Ore).is_err());
    }

    #[test]
    fn validate_rejects_inverted_height_range() {
        let mut meta = WorldgenMeta::default();
        meta.target_block = "minecraft:stone".into();
        meta.min_y = 100;
        meta.max_y = 0;
        assert!(validate(&meta, WorldgenKind::Ore).is_err());
    }

    #[test]
    fn ore_configured_feature_emits_targets() {
        let mut meta = WorldgenMeta::default();
        meta.target_block = "modid:ruby_ore".into();
        meta.vein_size = 9;

        let cf = configured_feature_json("ruby_ore", "modid", WorldgenKind::Ore, &meta);
        let s = serde_json::to_string(&cf).unwrap();
        assert!(s.contains("minecraft:ore"), "got {s}");
        assert!(s.contains("\"size\":9"), "got {s}");
        assert!(s.contains("modid:ruby_ore"), "got {s}");
    }

    #[test]
    fn placed_feature_includes_height_range_and_in_square() {
        let mut meta = WorldgenMeta::default();
        meta.count = 12;
        meta.min_y = -32;
        meta.max_y = 64;
        let pf = placed_feature_json("ruby_ore", "modid", &meta);
        let s = serde_json::to_string(&pf).unwrap();
        assert!(s.contains("minecraft:in_square"), "got {s}");
        assert!(s.contains("minecraft:height_range"), "got {s}");
        assert!(s.contains("\"count\":12"), "got {s}");
    }

    #[test]
    fn placed_feature_emits_rarity_only_when_above_one() {
        let mut meta = WorldgenMeta::default();
        meta.rarity = 0;
        let pf = placed_feature_json("a", "modid", &meta);
        assert!(!serde_json::to_string(&pf).unwrap().contains("rarity_filter"));

        meta.rarity = 8;
        let pf = placed_feature_json("a", "modid", &meta);
        assert!(serde_json::to_string(&pf).unwrap().contains("rarity_filter"));
    }

    #[test]
    fn forge_biome_modifier_uses_correct_codec_per_loader() {
        let meta = WorldgenMeta::default();
        let forge = forge_biome_modifier_json("a", "modid", &meta, LoaderId::Forge);
        assert!(forge["type"].as_str().unwrap().starts_with("forge:"));

        let neo = forge_biome_modifier_json("a", "modid", &meta, LoaderId::NeoForge);
        assert!(neo["type"].as_str().unwrap().starts_with("neoforge:"));
    }

    #[test]
    fn tree_validation_enforces_trunk_height_and_radius() {
        let mut meta = WorldgenMeta::default();
        meta.kind = "tree".into();
        meta.target_block = "irrelevant".into();
        meta.trunk_height = 0;
        assert!(validate(&meta, WorldgenKind::Tree).is_err());
        meta.trunk_height = 5;
        meta.foliage_radius = 9;
        assert!(validate(&meta, WorldgenKind::Tree).is_err());
    }
}
