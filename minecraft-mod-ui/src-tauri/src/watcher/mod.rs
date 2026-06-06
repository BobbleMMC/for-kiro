use notify::{Config, Event, EventKind, RecommendedWatcher, Watcher};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

use crate::db::{operations::FileEntry, Database};

/// File system event emitted to frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct FileSystemEvent {
    pub event_type: String,   // "created", "modified", "removed"
    pub file_path: String,
    pub file_type: String,
}

/// Determine file type from extension
fn get_file_type(path: &Path) -> String {
    match path.extension().and_then(|e| e.to_str()) {
        Some("java") => "code".to_string(),
        Some("json") => "config".to_string(),
        Some("png") | Some("jpg") => "texture".to_string(),
        Some("ogg") | Some("wav") => "sound".to_string(),
        Some("mcmeta") => "metadata".to_string(),
        Some("toml") | Some("gradle") => "build".to_string(),
        _ => "file".to_string(),
    }
}

/// Start watching a project directory for file changes
pub fn start_watcher(
    app_handle: AppHandle,
    project_path: PathBuf,
    project_id: i64,
    db: Arc<Database>,
) -> Result<RecommendedWatcher, String> {
    let (tx, mut rx) = mpsc::channel::<Event>(100);

    // Spawn async handler for events
    let app_clone = app_handle.clone();
    let db_clone = db.clone();
    let project_path_clone = project_path.clone();

    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            handle_fs_event(&app_clone, &db_clone, project_id, &project_path_clone, event);
        }
    });

    // Create watcher with debounce
    let watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            if let Ok(event) = result {
                let _ = tx.blocking_send(event);
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    Ok(watcher)
}

/// Handle a file system event
fn handle_fs_event(
    app: &AppHandle,
    db: &Database,
    project_id: i64,
    project_root: &Path,
    event: Event,
) {
    let event_type = match event.kind {
        EventKind::Create(_) => "created",
        EventKind::Modify(_) => "modified",
        EventKind::Remove(_) => "removed",
        _ => return,
    };

    for path in &event.paths {
        // Get relative path from project root
        let relative_path = match path.strip_prefix(project_root) {
            Ok(p) => p.to_string_lossy().to_string(),
            Err(_) => continue,
        };

        // Skip hidden files and build output
        if relative_path.starts_with('.') || relative_path.contains("/build/") {
            continue;
        }

        let file_type = get_file_type(path);

        // Update database
        match event_type {
            "created" | "modified" => {
                let file_size = std::fs::metadata(path).map(|m| m.len() as i64).ok();
                let entry = FileEntry {
                    id: None,
                    project_id,
                    file_path: relative_path.clone(),
                    file_type: file_type.clone(),
                    file_size,
                    last_modified: Some(chrono::Utc::now().to_rfc3339()),
                };
                let _ = db.upsert_file(&entry);
            }
            "removed" => {
                let _ = db.remove_file(project_id, &relative_path);
            }
            _ => {}
        }

        // Emit event to frontend
        let fs_event = FileSystemEvent {
            event_type: event_type.to_string(),
            file_path: relative_path,
            file_type,
        };

        let _ = app.emit("fs-event", &fs_event);
    }
}
