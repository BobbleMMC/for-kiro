//! Gradle build orchestration.
//!
//! `run_gradle_build` shells out to `./gradlew clean build` in the
//! project's working directory. The directory is supplied either:
//!   * directly by the caller (`project_path`), or
//!   * resolved from the database when only `project_id` is known
//!     (looked up via the scaffold marker stored in `file_registry`).
//!
//! On success / failure we persist a `build_logs` row so the project
//! stats (`build_count`, last build status) stay accurate.

use std::process::Command;
use tauri::{AppHandle, Emitter, State};

use super::project_commands::DbState;

#[derive(Debug, Clone, serde::Serialize)]
pub struct BuildOutput {
    pub status: String,
    pub output: String,
    pub errors: Vec<String>,
    pub build_time_ms: u64,
    pub artifact_path: Option<String>,
}

#[tauri::command]
pub async fn run_gradle_build(
    app: AppHandle,
    db: State<'_, DbState>,
    project_id: Option<i64>,
    project_path: Option<String>,
) -> Result<BuildOutput, String> {
    // Resolve working directory
    let working_dir = match (project_path, project_id) {
        (Some(p), _) => p,
        (None, Some(id)) => {
            let files = db
                .0
                .get_files(id)
                .map_err(|e| format!("Failed to query file registry: {}", e))?;
            files
                .into_iter()
                .find(|f| f.file_path == "__project_root__")
                .and_then(|f| f.last_modified)
                .ok_or_else(|| {
                    "Project has not been scaffolded yet. Run scaffold_project first.".to_string()
                })?
        }
        (None, None) => return Err("Either project_path or project_id is required".to_string()),
    };

    let start = std::time::Instant::now();
    let _ = app.emit("build-status", "started");

    // Determine gradle wrapper
    let gradle_cmd = if cfg!(target_os = "windows") {
        format!("{}\\gradlew.bat", working_dir)
    } else {
        format!("{}/gradlew", working_dir)
    };

    let output = Command::new(&gradle_cmd)
        .args(["clean", "build", "--no-daemon"])
        .current_dir(&working_dir)
        .output()
        .map_err(|e| format!("Failed to execute gradle ({}): {}", gradle_cmd, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let elapsed = start.elapsed().as_millis() as u64;

    let errors: Vec<String> = stderr
        .lines()
        .chain(stdout.lines())
        .filter(|line| line.contains("error:") || line.starts_with("FAILURE:"))
        .map(|s| s.to_string())
        .collect();
    let warnings: i32 = stdout.lines().filter(|l| l.contains("warning:")).count() as i32;

    let status = if output.status.success() { "success" } else { "failed" };

    let combined = format!("{}\n{}", stdout, stderr);

    // Locate the produced jar (best effort)
    let artifact_path = if status == "success" {
        let libs_dir = std::path::Path::new(&working_dir).join("build").join("libs");
        std::fs::read_dir(&libs_dir)
            .ok()
            .and_then(|mut entries| {
                entries.find_map(|e| {
                    e.ok().map(|e| e.path()).and_then(|p| {
                        if p.extension().and_then(|s| s.to_str()) == Some("jar") {
                            p.to_str().map(String::from)
                        } else {
                            None
                        }
                    })
                })
            })
    } else {
        None
    };

    // Persist build log + bump project counters
    if let Some(pid) = project_id {
        let _ = db.0.create_build_log(
            pid,
            status,
            &combined,
            errors.first().map(|s| s.as_str()),
            warnings,
            errors.len() as i32,
            elapsed as i64,
        );
        let _ = db.0.increment_build_count(pid);
    }

    let _ = app.emit("build-status", status);

    Ok(BuildOutput {
        status: status.to_string(),
        output: combined,
        errors,
        build_time_ms: elapsed,
        artifact_path,
    })
}

#[tauri::command]
pub async fn check_java_version() -> Result<String, String> {
    let output = Command::new("java")
        .arg("-version")
        .output()
        .map_err(|e| format!("Java not found: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stderr).to_string())
}
