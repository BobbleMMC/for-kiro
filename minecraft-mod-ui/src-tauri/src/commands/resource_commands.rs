//! Tauri commands exposing the sidecar resource bundle to the frontend.

use crate::resources;

#[tauri::command]
pub fn get_resource_text(path: String) -> Result<String, String> {
    resources::read_text(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_resources() -> Vec<String> {
    resources::list()
}
