//! Tauri commands that let the frontend start / stop file watching for the
//! current project.
//!
//! The watcher is held in app state behind a Mutex so we keep at most one
//! active watcher at a time. Selecting a different project automatically
//! replaces the previous watcher (the old `RecommendedWatcher` is dropped,
//! which stops it).

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::watcher::start_watcher;
use super::project_commands::DbState;

/// Holds the currently active filesystem watcher. `None` means we are not
/// watching anything right now.
#[derive(Default)]
pub struct WatcherState {
    pub current: Mutex<Option<notify::RecommendedWatcher>>,
}

#[tauri::command]
pub async fn start_watching(
    app: AppHandle,
    db: State<'_, DbState>,
    watcher_state: State<'_, WatcherState>,
    project_id: i64,
) -> Result<String, String> {
    // Resolve the on-disk project path via the scaffold marker.
    let files = db
        .0
        .get_files(project_id)
        .map_err(|e| format!("Failed to query file registry: {}", e))?;

    let path = files
        .into_iter()
        .find(|f| f.file_path == "__project_root__")
        .and_then(|f| f.last_modified)
        .ok_or_else(|| {
            "Project has not been scaffolded yet — run scaffold_project first.".to_string()
        })?;

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Project path no longer exists: {}", path));
    }

    let watcher = start_watcher(app, path_buf, project_id, db.0.clone())?;

    // Replace any previous watcher; dropping it stops the old one.
    let mut guard = watcher_state
        .current
        .lock()
        .map_err(|e| format!("Watcher mutex poisoned: {}", e))?;
    *guard = Some(watcher);

    Ok(path)
}

#[tauri::command]
pub async fn stop_watching(watcher_state: State<'_, WatcherState>) -> Result<(), String> {
    let mut guard = watcher_state
        .current
        .lock()
        .map_err(|e| format!("Watcher mutex poisoned: {}", e))?;
    *guard = None; // Drop = stop watching
    Ok(())
}
