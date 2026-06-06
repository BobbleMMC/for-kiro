use std::process::Command;
use tauri::{AppHandle, Emitter, State};

use super::project_commands::DbState;

#[derive(Debug, Clone, serde::Serialize)]
pub struct BuildOutput {
    pub status: String,
    pub output: String,
    pub errors: Vec<String>,
    pub build_time_ms: u64,
}

#[tauri::command]
pub async fn run_gradle_build(
    app: AppHandle,
    _db: State<'_, DbState>,
    project_path: String,
) -> Result<BuildOutput, String> {
    let start = std::time::Instant::now();

    // Emit build started event
    let _ = app.emit("build-status", "started");

    // Determine gradle wrapper path
    let gradle_cmd = if cfg!(target_os = "windows") {
        format!("{}\\gradlew.bat", project_path)
    } else {
        format!("{}/gradlew", project_path)
    };

    // Execute gradle build
    let output = Command::new(&gradle_cmd)
        .args(["clean", "build"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to execute gradle: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let elapsed = start.elapsed().as_millis() as u64;

    let errors: Vec<String> = stderr
        .lines()
        .filter(|line| line.contains("ERROR") || line.contains("error:"))
        .map(|s| s.to_string())
        .collect();

    let status = if output.status.success() {
        "success".to_string()
    } else {
        "failed".to_string()
    };

    let build_output = BuildOutput {
        status: status.clone(),
        output: format!("{}\n{}", stdout, stderr),
        errors,
        build_time_ms: elapsed,
    };

    // Emit build completed event
    let _ = app.emit("build-status", &status);

    Ok(build_output)
}

#[tauri::command]
pub async fn check_java_version() -> Result<String, String> {
    let output = Command::new("java")
        .arg("-version")
        .output()
        .map_err(|e| format!("Java not found: {}", e))?;

    let version_output = String::from_utf8_lossy(&output.stderr).to_string();
    Ok(version_output)
}
