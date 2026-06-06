use std::sync::Arc;
use tauri::State;

use crate::db::{operations::Project, Database};

pub struct DbState(pub Arc<Database>);

#[tauri::command]
pub async fn create_project(
    db: State<'_, DbState>,
    name: String,
    description: Option<String>,
    minecraft_version: String,
    mod_loader: String,
    mod_version: Option<String>,
    author: String,
    namespace: String,
) -> Result<i64, String> {
    let project = Project {
        id: None,
        name,
        description,
        minecraft_version,
        mod_loader,
        mod_version: mod_version.unwrap_or_else(|| "1.0.0".to_string()),
        author,
        namespace,
        build_count: 0,
        is_archived: false,
        created_at: None,
        updated_at: None,
    };

    db.0.create_project(&project)
        .map_err(|e| format!("Failed to create project: {}", e))
}

#[tauri::command]
pub async fn update_project(
    db: State<'_, DbState>,
    id: i64,
    name: String,
    description: Option<String>,
    minecraft_version: String,
    mod_loader: String,
    mod_version: String,
    author: String,
    namespace: String,
) -> Result<(), String> {
    let project = Project {
        id: Some(id),
        name,
        description,
        minecraft_version,
        mod_loader,
        mod_version,
        author,
        namespace,
        build_count: 0,
        is_archived: false,
        created_at: None,
        updated_at: None,
    };

    db.0.update_project(&project)
        .map_err(|e| format!("Failed to update project: {}", e))
}

#[tauri::command]
pub async fn get_projects(db: State<'_, DbState>) -> Result<Vec<Project>, String> {
    db.0.get_projects()
        .map_err(|e| format!("Failed to get projects: {}", e))
}

#[tauri::command]
pub async fn get_project(db: State<'_, DbState>, id: i64) -> Result<Option<Project>, String> {
    db.0.get_project(id)
        .map_err(|e| format!("Failed to get project: {}", e))
}

#[tauri::command]
pub async fn delete_project(db: State<'_, DbState>, id: i64) -> Result<(), String> {
    db.0.delete_project(id)
        .map_err(|e| format!("Failed to delete project: {}", e))
}
