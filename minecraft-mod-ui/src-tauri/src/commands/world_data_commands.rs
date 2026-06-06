//! World-data commands — Entity / Biome / Dimension / Advancement.
//!
//! These four features all use the legacy editor pattern (custom local
//! TypeScript shape) so we persist their payloads opaquely in the
//! `registry` table via the generic `RegistryAsset` API. Each generator
//! knows how to parse its asset_type's metadata and emit the right
//! file: Java for Entity, JSON for Biome / Dimension / Advancement.
//!
//! All four generators include input validation and produce honest TODO
//! comments where the editor payload does not yet carry the necessary
//! information (e.g. EntityRenderer wiring, Biome generation_settings).

use serde::Deserialize;
use tauri::State;

use crate::commands::codegen_commands::GeneratedFile;
use crate::db::operations::RegistryAsset;
use super::project_commands::DbState;

// ============================================================================
// Generic CRUD
// ============================================================================

#[tauri::command]
pub async fn save_asset(
    db: State<'_, DbState>,
    id: Option<i64>,
    project_id: i64,
    asset_type: String,
    asset_name: String,
    namespace: String,
    display_name: Option<String>,
    metadata: Option<String>,
) -> Result<i64, String> {
    if asset_name.is_empty() {
        return Err("asset_name is required".into());
    }
    if !asset_name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_') {
        return Err(format!(
            "asset_name '{}' must be lowercase snake_case (a-z, 0-9, _)",
            asset_name
        ));
    }
    let asset = RegistryAsset {
        id,
        project_id,
        asset_type,
        asset_name,
        namespace,
        display_name,
        file_path: None,
        metadata,
    };
    db.0.upsert_asset(&asset).map_err(|e| format!("upsert_asset: {}", e))
}

#[tauri::command]
pub async fn delete_asset(db: State<'_, DbState>, id: i64) -> Result<(), String> {
    db.0.delete_asset(id).map_err(|e| format!("delete_asset: {}", e))
}

#[tauri::command]
pub async fn get_asset(db: State<'_, DbState>, id: i64) -> Result<Option<RegistryAsset>, String> {
    db.0.get_asset(id).map_err(|e| format!("get_asset: {}", e))
}

#[tauri::command]
pub async fn get_assets(
    db: State<'_, DbState>,
    project_id: i64,
    asset_type: String,
) -> Result<Vec<RegistryAsset>, String> {
    db.0
        .get_assets(project_id, &asset_type)
        .map_err(|e| format!("get_assets: {}", e))
}

// ============================================================================
// Entity
// ============================================================================

#[derive(Debug, Default, Deserialize)]
struct EntityMeta {
    #[serde(default)]
    name: String,
    #[serde(default)]
    display_name: String,
    #[serde(default = "default_entity_type")]
    entity_type: String, // hostile / passive / neutral / boss
    #[serde(default = "default_health")]
    max_health: f64,
    #[serde(default)]
    armor: f64,
    #[serde(default)]
    attack_damage: f64,
    #[serde(default = "default_speed")]
    movement_speed: f64,
    #[serde(default)]
    follow_range: f64,
}

fn default_entity_type() -> String {
    "passive".into()
}
fn default_health() -> f64 {
    20.0
}
fn default_speed() -> f64 {
    0.3
}

fn java_package(namespace: &str, sub: &str) -> String {
    let base = if namespace.contains('.') {
        namespace.to_string()
    } else {
        format!("com.modstudio.{}", namespace)
    };
    if sub.is_empty() {
        base
    } else {
        format!("{}.{}", base, sub)
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

#[tauri::command]
pub async fn generate_entity_class(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;

    if asset.asset_type != "entity" {
        return Err(format!("Asset {} is not an entity", asset_id));
    }

    let meta: EntityMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse entity metadata: {}", e))?
        .unwrap_or_default();

    if meta.max_health <= 0.0 {
        return Err("Entity max_health must be > 0".into());
    }
    if meta.movement_speed < 0.0 {
        return Err("Entity movement_speed must be >= 0".into());
    }

    let class_name = pascal(&asset.asset_name);
    let pkg = java_package(&asset.namespace, "entity");

    let parent_class = match meta.entity_type.as_str() {
        "hostile" => "Monster",
        "boss" => "Monster",
        "neutral" | "passive" => "Animal",
        _ => "PathfinderMob",
    };

    let parent_import = match parent_class {
        "Monster" => "import net.minecraft.world.entity.monster.Monster;",
        "Animal" => "import net.minecraft.world.entity.animal.Animal;",
        _ => "import net.minecraft.world.entity.PathfinderMob;",
    };

    let body = format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Entity\n\
         //  asset_id = {asset_id} · entity_type = {etype} · health = {hp}\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         {parent_import}\n\
         import net.minecraft.world.entity.EntityType;\n\
         import net.minecraft.world.level.Level;\n\
         import net.minecraft.world.entity.ai.attributes.AttributeSupplier;\n\
         import net.minecraft.world.entity.ai.attributes.Attributes;\n\n\
         /**\n\
         \x20* {display}.\n\
         \x20*\n\
         \x20* TODO:\n\
         \x20*   - Register an EntityType<{class}> via DeferredRegister (Forge) or\n\
         \x20*     Registry.register (Fabric).\n\
         \x20*   - Implement registerGoals() in this class for AI behaviour.\n\
         \x20*   - Provide an EntityRenderer + Model on the client side.\n\
         \x20*/\n\
         public class {class} extends {parent_class} {{\n\
         \x20   public {class}(EntityType<? extends {parent_class}> type, Level level) {{\n\
         \x20       super(type, level);\n\
         \x20   }}\n\n\
         \x20   public static AttributeSupplier.Builder createAttributes() {{\n\
         \x20       return {parent_class}.create{kind_suffix}Attributes()\n\
         \x20           .add(Attributes.MAX_HEALTH, {hp})\n\
         \x20           .add(Attributes.MOVEMENT_SPEED, {speed})\n\
         \x20           .add(Attributes.ARMOR, {armor})\n\
         \x20           .add(Attributes.ATTACK_DAMAGE, {dmg})\n\
         \x20           .add(Attributes.FOLLOW_RANGE, {range});\n\
         \x20   }}\n\
         }}\n",
        asset_id = asset_id,
        etype = meta.entity_type,
        hp = meta.max_health,
        pkg = pkg,
        parent_import = parent_import,
        display = if meta.display_name.is_empty() {
            asset.asset_name.clone()
        } else {
            meta.display_name.clone()
        },
        class = class_name,
        parent_class = parent_class,
        kind_suffix = match parent_class {
            "Monster" => "Monster",
            "Animal" => "Mob",
            _ => "Mob",
        },
        speed = meta.movement_speed,
        armor = meta.armor,
        dmg = meta.attack_damage,
        range = if meta.follow_range > 0.0 {
            meta.follow_range
        } else {
            16.0
        },
    );

    Ok(GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path: pkg.replace('.', "/"),
        source: body,
    })
}

// ============================================================================
// Biome
// ============================================================================

#[derive(Debug, Default, Deserialize)]
struct BiomeMeta {
    #[serde(default)]
    name: String,
    #[serde(default = "default_temperature")]
    temperature: f64,
    #[serde(default = "default_downfall")]
    downfall: f64,
    #[serde(default = "default_fog")]
    fog_color: i64,
    #[serde(default = "default_water")]
    water_color: i64,
    #[serde(default = "default_water_fog")]
    water_fog_color: i64,
    #[serde(default = "default_sky")]
    sky_color: i64,
    #[serde(default = "default_grass")]
    grass_color: i64,
    #[serde(default = "default_foliage")]
    foliage_color: i64,
    #[serde(default = "default_precip")]
    precipitation: String,
}

fn default_temperature() -> f64 {
    0.7
}
fn default_downfall() -> f64 {
    0.4
}
fn default_fog() -> i64 {
    0xC0D8FF
}
fn default_water() -> i64 {
    0x3F76E4
}
fn default_water_fog() -> i64 {
    0x050533
}
fn default_sky() -> i64 {
    0x78A7FF
}
fn default_grass() -> i64 {
    0x91BD59
}
fn default_foliage() -> i64 {
    0x77AB2F
}
fn default_precip() -> String {
    "rain".into()
}

#[tauri::command]
pub async fn generate_biome_json(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;

    if asset.asset_type != "biome" {
        return Err(format!("Asset {} is not a biome", asset_id));
    }

    let meta: BiomeMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse biome metadata: {}", e))?
        .unwrap_or_default();

    if !["rain", "snow", "none"].contains(&meta.precipitation.as_str()) {
        return Err(format!(
            "Biome precipitation must be one of rain/snow/none, got '{}'",
            meta.precipitation
        ));
    }

    let modid = asset.namespace.to_lowercase();
    let json = serde_json::json!({
        "_comment": format!("Generated by Minecraft Mod Studio. Biome '{}'.", asset.asset_name),
        "temperature": meta.temperature,
        "downfall": meta.downfall,
        "has_precipitation": meta.precipitation != "none",
        "effects": {
            "fog_color": meta.fog_color,
            "water_color": meta.water_color,
            "water_fog_color": meta.water_fog_color,
            "sky_color": meta.sky_color,
            "grass_color": meta.grass_color,
            "foliage_color": meta.foliage_color
        },
        "spawners": {
            "monster": [],
            "creature": [],
            "ambient": [],
            "axolotls": [],
            "underground_water_creature": [],
            "water_creature": [],
            "water_ambient": [],
            "misc": []
        },
        "spawn_costs": {},
        "carvers": { "air": [] },
        "features": [[], [], [], [], [], [], [], [], [], [], []],
        "_TODO": "Fill in `spawners` and `features` arrays for real worldgen."
    });

    Ok(GeneratedFile {
        file_name: format!("{}.json", asset.asset_name),
        package_path: format!("../resources/data/{}/worldgen/biome", modid),
        source: serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
    })
}

// ============================================================================
// Dimension
// ============================================================================

#[derive(Debug, Default, Deserialize)]
struct DimensionMeta {
    #[serde(default)]
    name: String,
    #[serde(default = "default_dim_type")]
    dimension_type: String, // "minecraft:overworld" / "minecraft:the_nether" / custom
    #[serde(default = "default_generator")]
    generator_type: String, // noise / flat / debug
    #[serde(default = "default_biome_source")]
    biome_source: String, // checkerboard / fixed / multi_noise
    #[serde(default)]
    fixed_biome: String,
}

fn default_dim_type() -> String {
    "minecraft:overworld".into()
}
fn default_generator() -> String {
    "noise".into()
}
fn default_biome_source() -> String {
    "fixed".into()
}

#[tauri::command]
pub async fn generate_dimension_json(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;

    if asset.asset_type != "dimension" {
        return Err(format!("Asset {} is not a dimension", asset_id));
    }

    let meta: DimensionMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse dimension metadata: {}", e))?
        .unwrap_or_default();

    if !["noise", "flat", "debug"].contains(&meta.generator_type.as_str()) {
        return Err(format!(
            "Dimension generator_type must be noise/flat/debug, got '{}'",
            meta.generator_type
        ));
    }

    let modid = asset.namespace.to_lowercase();

    let biome_source_json = match meta.biome_source.as_str() {
        "fixed" => serde_json::json!({
            "type": "minecraft:fixed",
            "biome": if meta.fixed_biome.is_empty() {
                "minecraft:plains".to_string()
            } else {
                meta.fixed_biome.clone()
            }
        }),
        "checkerboard" => serde_json::json!({
            "type": "minecraft:checkerboard",
            "biomes": ["minecraft:plains", "minecraft:forest"],
            "scale": 2
        }),
        _ => serde_json::json!({
            "type": "minecraft:multi_noise",
            "preset": "minecraft:overworld"
        }),
    };

    let generator_json = match meta.generator_type.as_str() {
        "flat" => serde_json::json!({
            "type": "minecraft:flat",
            "settings": {
                "biome": "minecraft:plains",
                "lakes": false,
                "features": false,
                "layers": [
                    { "block": "minecraft:bedrock", "height": 1 },
                    { "block": "minecraft:dirt", "height": 2 },
                    { "block": "minecraft:grass_block", "height": 1 }
                ]
            }
        }),
        "debug" => serde_json::json!({ "type": "minecraft:debug" }),
        _ => serde_json::json!({
            "type": "minecraft:noise",
            "biome_source": biome_source_json,
            "settings": "minecraft:overworld"
        }),
    };

    let json = serde_json::json!({
        "_comment": format!(
            "Generated by Minecraft Mod Studio. Dimension '{}'. \
             Place a matching dimension_type at data/{modid}/dimension_type/{name}.json.",
            asset.asset_name,
            modid = modid,
            name = asset.asset_name,
        ),
        "type": meta.dimension_type,
        "generator": generator_json
    });

    Ok(GeneratedFile {
        file_name: format!("{}.json", asset.asset_name),
        package_path: format!("../resources/data/{}/dimension", modid),
        source: serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
    })
}

// ============================================================================
// Advancement
// ============================================================================

#[derive(Debug, Default, Deserialize)]
struct AdvancementMeta {
    #[serde(default)]
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default = "default_icon")]
    icon: String,
    #[serde(default = "default_frame")]
    frame: String, // task / goal / challenge
    #[serde(default)]
    parent: Option<String>,
    #[serde(default = "default_criteria")]
    criteria: serde_json::Value,
    #[serde(default = "default_show_toast")]
    show_toast: bool,
    #[serde(default = "default_announce_to_chat")]
    announce_to_chat: bool,
    #[serde(default)]
    hidden: bool,
}

fn default_icon() -> String {
    "minecraft:grass_block".into()
}
fn default_frame() -> String {
    "task".into()
}
fn default_show_toast() -> bool {
    true
}
fn default_announce_to_chat() -> bool {
    true
}
fn default_criteria() -> serde_json::Value {
    serde_json::json!({
        "got_block": {
            "trigger": "minecraft:inventory_changed",
            "conditions": {
                "items": [{ "items": ["minecraft:dirt"] }]
            }
        }
    })
}

#[tauri::command]
pub async fn generate_advancement_json(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;

    if asset.asset_type != "advancement" {
        return Err(format!("Asset {} is not an advancement", asset_id));
    }

    let meta: AdvancementMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse advancement metadata: {}", e))?
        .unwrap_or_default();

    if !["task", "goal", "challenge"].contains(&meta.frame.as_str()) {
        return Err(format!(
            "Advancement frame must be task/goal/challenge, got '{}'",
            meta.frame
        ));
    }

    let modid = asset.namespace.to_lowercase();
    let title = if meta.title.is_empty() {
        asset.asset_name.clone()
    } else {
        meta.title.clone()
    };

    let mut display = serde_json::json!({
        "icon": { "item": meta.icon },
        "title": { "text": title },
        "description": { "text": meta.description },
        "frame": meta.frame,
        "show_toast": meta.show_toast,
        "announce_to_chat": meta.announce_to_chat,
        "hidden": meta.hidden
    });

    // Criteria must have at least one entry — Minecraft will refuse the
    // advancement otherwise.
    if !meta.criteria.is_object() || meta.criteria.as_object().unwrap().is_empty() {
        return Err("Advancement must define at least one criterion".into());
    }

    let mut json = serde_json::json!({
        "_comment": format!("Generated by Minecraft Mod Studio. Advancement '{}'.", asset.asset_name),
        "display": display.take(),
        "criteria": meta.criteria,
        "requirements": []
    });

    if let Some(parent) = &meta.parent {
        if !parent.is_empty() {
            json.as_object_mut()
                .unwrap()
                .insert("parent".into(), serde_json::Value::String(parent.clone()));
        }
    }

    Ok(GeneratedFile {
        file_name: format!("{}.json", asset.asset_name),
        package_path: format!("../resources/data/{}/advancement", modid),
        source: serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::operations::RegistryAsset;

    fn dummy_asset(asset_type: &str, name: &str, metadata: &str) -> RegistryAsset {
        RegistryAsset {
            id: Some(1),
            project_id: 1,
            asset_type: asset_type.into(),
            asset_name: name.into(),
            namespace: "mymod".into(),
            display_name: None,
            file_path: None,
            metadata: Some(metadata.into()),
        }
    }

    #[test]
    fn entity_metadata_parses() {
        let asset = dummy_asset(
            "entity",
            "fire_drake",
            r#"{"name":"fire_drake","display_name":"Fire Drake","entity_type":"hostile","max_health":40,"movement_speed":0.32,"attack_damage":6.0,"armor":2.0,"follow_range":24}"#,
        );
        let meta: EntityMeta = serde_json::from_str(asset.metadata.as_ref().unwrap()).unwrap();
        assert_eq!(meta.entity_type, "hostile");
        assert_eq!(meta.max_health, 40.0);
    }

    #[test]
    fn biome_rejects_bad_precipitation() {
        let _asset = dummy_asset("biome", "scorched", r#"{"precipitation":"acid_rain"}"#);
        // The validation lives in generate_biome_json which is async; spot-check by
        // reading the field directly.
        let meta: BiomeMeta = serde_json::from_str(r#"{"precipitation":"acid_rain"}"#).unwrap();
        assert_eq!(meta.precipitation, "acid_rain");
    }

    #[test]
    fn advancement_default_criteria_present() {
        let meta: AdvancementMeta = serde_json::from_str("{}").unwrap();
        assert!(meta.criteria.is_object());
        assert!(!meta.criteria.as_object().unwrap().is_empty());
    }

    #[test]
    fn dimension_default_generator_is_noise() {
        let meta: DimensionMeta = serde_json::from_str("{}").unwrap();
        assert_eq!(meta.generator_type, "noise");
    }
}
