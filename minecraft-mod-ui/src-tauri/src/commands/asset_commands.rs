use tauri::State;

use crate::db::operations::{Block, Item};
use super::project_commands::DbState;

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
pub async fn get_blocks(db: State<'_, DbState>, project_id: i64) -> Result<Vec<Block>, String> {
    db.0.get_blocks(project_id)
        .map_err(|e| format!("Failed to get blocks: {}", e))
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
) -> Result<i64, String> {
    let item = Item {
        id: None,
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
    };

    db.0.create_item(&item)
        .map_err(|e| format!("Failed to create item: {}", e))
}
