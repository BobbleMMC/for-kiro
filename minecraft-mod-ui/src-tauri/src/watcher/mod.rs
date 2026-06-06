//! File-system watcher.
//!
//! `start_watcher` returns a `RecommendedWatcher` that has already had
//! `watch(&project_path, RecursiveMode::Recursive)` called on it — the
//! caller's only job is to keep the value alive (drop = stop watching).
//!
//! Each filesystem change is forwarded to the frontend as a typed
//! `fs-event` Tauri event and persisted to the `file_registry` table so
//! the project's known-files set stays in sync with disk.

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

use crate::db::{operations::FileEntry, Database};

/// File system event emitted to frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct FileSystemEvent {
    pub event_type: String, // "created", "modified", "removed"
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

/// Spawn a `notify` watcher rooted at `project_path` and forward every
/// event to the frontend + DB. The returned `RecommendedWatcher` must be
/// kept alive (e.g. stored in app state) — dropping it stops watching.
pub fn start_watcher(
    app_handle: AppHandle,
    project_path: PathBuf,
    project_id: i64,
    db: Arc<Database>,
) -> Result<RecommendedWatcher, String> {
    let (tx, mut rx) = mpsc::channel::<Event>(256);

    // Spawn async handler that consumes events and updates DB + frontend.
    let app_clone = app_handle.clone();
    let db_clone = db.clone();
    let project_root = project_path.clone();
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            handle_fs_event(&app_clone, &db_clone, project_id, &project_root, event);
        }
    });

    // Create the watcher. The closure runs on the notify worker thread,
    // so we use `blocking_send` to push into the tokio channel.
    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            if let Ok(event) = result {
                let _ = tx.blocking_send(event);
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // **The bit that was missing before** — actually subscribe to the path.
    watcher
        .watch(&project_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch {:?}: {}", project_path, e))?;

    log::info!("Watching project directory: {:?}", project_path);

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

        // Skip hidden files, build output, and gradle metadata
        if relative_path.starts_with('.')
            || relative_path.contains("/build/")
            || relative_path.contains("\\build\\")
            || relative_path.contains("/.gradle/")
            || relative_path.contains("/run/")
        {
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
