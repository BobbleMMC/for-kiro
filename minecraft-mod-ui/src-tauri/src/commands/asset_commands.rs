use tauri::State;

use crate::db::operations::{Block, Item};
use super::project_commands::DbState;

// ===== Block Commands =====

#[tauri::command]
pub async fn create_block(
    db: State<'_, DbState>,
    project_id: i64,
    block_name: String,
    display_name: String,
    namespace: String,
    hardness: f64,
    resistance: f64,
    luminance: i32,
    is_solid: bool,
    has_collision: bool,
    has_gravity: bool,
    is_flammable: bool,
    material_type: String,
    texture_all: Option<String>,
) -> Result<i64, String> {
    let block = Block {
        id: None,
        project_id,
        block_name,
        display_name,
        namespace,
        hardness,
        resistance,
        luminance,
        is_solid,
        has_collision,
        has_gravity,
        is_flammable,
        material_type,
        texture_all,
    };

    db.0.create_block(&block)
        .map_err(|e| format!("Failed to create block: {}", e))
}

#[tauri::command]
pub async fn update_block(
    db: State<'_, DbState>,
    id: i64,
    project_id: i64,
    block_name: String,
    display_name: String,
    namespace: String,
    hardness: f64,
    resistance: f64,
    luminance: i32,
    is_solid: bool,
    has_collision: bool,
    has_gravity: bool,
    is_flammable: bool,
    material_type: String,
    texture_all: Option<String>,
) -> Result<(), String> {
    let block = Block {
        id: Some(id),
        project_id,
        block_name,
        display_name,
        namespace,
        hardness,
        resistance,
        luminance,
        is_solid,
        has_collision,
        has_gravity,
        is_flammable,
        material_type,
        texture_all,
    };

    db.0.update_block(&block)
        .map_err(|e| format!("Failed to update block: {}", e))
}

#[tauri::command]
pub async fn delete_block(db: State<'_, DbState>, id: i64) -> Result<(), String> {
    db.0.delete_block(id)
        .map_err(|e| format!("Failed to delete block: {}", e))
}

#[tauri::command]
pub async fn get_block(db: State<'_, DbState>, id: i64) -> Result<Option<Block>, String> {
    db.0.get_block(id)
        .map_err(|e| format!("Failed to get block: {}", e))
}

#[tauri::command]
pub async fn get_blocks(db: State<'_, DbState>, project_id: i64) -> Result<Vec<Block>, String> {
    db.0.get_blocks(project_id)
        .map_err(|e| format!("Failed to get blocks: {}", e))
}

// ===== Item Commands =====
//
// We keep the legacy 10-arg `create_item` / `update_item` signatures so the
// existing UI does not break. Extended fields (food, tool, armor, NBT,
// attributes, tags, glint, fire-resistant, …) are passed through a single
// optional `extras_json` blob — TypeScript wrappers serialise the full
// settings object to JSON, the Rust side merges it into the Item struct.

#[derive(Debug, Default, serde::Deserialize)]
pub struct ItemExtras {
    #[serde(default)]
    pub has_glint: bool,
    #[serde(default)]
    pub is_fire_resistant: bool,
    pub food_eat_seconds: Option<f64>,
    #[serde(default)]
    pub food_always_eat: bool,
    #[serde(default)]
    pub food_eat_fast: bool,
    pub food_effects_json: Option<String>,
    pub tool_kind: Option<String>,
    pub tool_tier: Option<String>,
    pub armor_material: Option<String>,
    pub armor_slot: Option<String>,
    pub armor_defense: Option<i32>,
    pub armor_toughness: Option<f64>,
    pub knockback_resistance: Option<f64>,
    pub attribute_modifiers_json: Option<String>,
    pub tags_json: Option<String>,
    pub custom_nbt_json: Option<String>,
    pub tooltip_lines_json: Option<String>,
    pub uses_remaining: Option<i32>,
    pub cooldown_ticks: Option<i32>,
    pub burn_time_ticks: Option<i32>,
    pub repair_ingredient: Option<String>,
    pub recipe_remainder: Option<String>,
}

fn build_item(
    id: Option<i64>,
    project_id: i64,
    item_name: String,
    display_name: String,
    namespace: String,
    max_stack_size: i32,
    rarity: String,
    is_enchantable: bool,
    durability: Option<i32>,
    attack_damage: Option<f64>,
    texture_path: Option<String>,
    extras_json: Option<String>,
) -> Result<Item, String> {
    let extras: ItemExtras = match extras_json.as_deref() {
        None | Some("") => ItemExtras::default(),
        Some(s) => serde_json::from_str(s)
            .map_err(|e| format!("Could not parse item extras_json: {}", e))?,
    };

    Ok(Item {
        id,
        project_id,
        item_name,
        display_name,
        namespace,
        max_stack_size,
        rarity,
        is_enchantable,
        durability,
        attack_damage,
        texture_path,
        has_glint: extras.has_glint,
        is_fire_resistant: extras.is_fire_resistant,
        food_eat_seconds: extras.food_eat_seconds,
        food_always_eat: extras.food_always_eat,
        food_eat_fast: extras.food_eat_fast,
        food_effects_json: extras.food_effects_json,
        tool_kind: extras.tool_kind,
        tool_tier: extras.tool_tier,
        armor_material: extras.armor_material,
        armor_slot: extras.armor_slot,
        armor_defense: extras.armor_defense,
        armor_toughness: extras.armor_toughness,
        knockback_resistance: extras.knockback_resistance,
        attribute_modifiers_json: extras.attribute_modifiers_json,
        tags_json: extras.tags_json,
        custom_nbt_json: extras.custom_nbt_json,
        tooltip_lines_json: extras.tooltip_lines_json,
        uses_remaining: extras.uses_remaining,
        cooldown_ticks: extras.cooldown_ticks,
        burn_time_ticks: extras.burn_time_ticks,
        repair_ingredient: extras.repair_ingredient,
        recipe_remainder: extras.recipe_remainder,
    })
}

#[tauri::command]
pub async fn create_item(
    db: State<'_, DbState>,
    project_id: i64,
    item_name: String,
    display_name: String,
    namespace: String,
    max_stack_size: i32,
    rarity: String,
    is_enchantable: bool,
    durability: Option<i32>,
    attack_damage: Option<f64>,
    texture_path: Option<String>,
    extras_json: Option<String>,
) -> Result<i64, String> {
    let item = build_item(
        None, project_id, item_name, display_name, namespace,
        max_stack_size, rarity, is_enchantable,
        durability, attack_damage, texture_path, extras_json,
    )?;

    db.0.create_item(&item)
        .map_err(|e| format!("Failed to create item: {}", e))
}

#[tauri::command]
pub async fn update_item(
    db: State<'_, DbState>,
    id: i64,
    project_id: i64,
    item_name: String,
    display_name: String,
    namespace: String,
    max_stack_size: i32,
    rarity: String,
    is_enchantable: bool,
    durability: Option<i32>,
    attack_damage: Option<f64>,
    texture_path: Option<String>,
    extras_json: Option<String>,
) -> Result<(), String> {
    let item = build_item(
        Some(id), project_id, item_name, display_name, namespace,
        max_stack_size, rarity, is_enchantable,
        durability, attack_damage, texture_path, extras_json,
    )?;

    db.0.update_item(&item)
        .map_err(|e| format!("Failed to update item: {}", e))
}

#[tauri::command]
pub async fn delete_item(db: State<'_, DbState>, id: i64) -> Result<(), String> {
    db.0.delete_item(id)
        .map_err(|e| format!("Failed to delete item: {}", e))
}

#[tauri::command]
pub async fn get_item(db: State<'_, DbState>, id: i64) -> Result<Option<Item>, String> {
    db.0.get_item(id)
        .map_err(|e| format!("Failed to get item: {}", e))
}

#[tauri::command]
pub async fn get_items(db: State<'_, DbState>, project_id: i64) -> Result<Vec<Item>, String> {
    db.0.get_items(project_id)
        .map_err(|e| format!("Failed to get items: {}", e))
}
