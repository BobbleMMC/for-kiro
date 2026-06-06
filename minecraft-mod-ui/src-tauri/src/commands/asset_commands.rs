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
) -> Result<(), String> {
    let item = Item {
        id: Some(id),
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
