//! Tauri commands that expose the Feature System catalog and the generic
//! skeleton emitter to the React frontend.
//!
//! Today the catalog has 25 features and three of them are wired all the
//! way through the studio (Block, Item, EventHandler). The remaining 22
//! report `CompletionStatus::Skeleton` or `Partial`. For those, the UI
//! calls `generate_feature_skeleton` to get an honest TODO-flavoured
//! starter file the user can iterate on by hand.
//!
//! `write_generated_file` (in codegen_commands.rs) accepts these skeleton
//! files unchanged, so the disk-writing flow is shared with the real
//! generators.

use tauri::State;

use crate::commands::codegen_commands::GeneratedFile;
use crate::feature_system::{
    all_features, skeleton::emit_java_skeleton, skeleton::emit_non_java_skeleton, FeatureInfo,
    FeatureKind,
};
use super::project_commands::DbState;

#[tauri::command]
pub async fn list_features() -> Result<Vec<FeatureInfo>, String> {
    Ok(all_features())
}

/// Generate a placeholder file for a feature that has no full generator
/// yet. The file shape (Java class, JSON, or .gradle snippet) depends on
/// the kind — the emitter picks the right format.
#[tauri::command]
pub async fn generate_feature_skeleton(
    db: State<'_, DbState>,
    project_id: i64,
    kind: String,
    name: String,
) -> Result<GeneratedFile, String> {
    let kind = FeatureKind::from_slug(&kind)
        .ok_or_else(|| format!("Unknown feature kind: {}", kind))?;

    let project = db
        .0
        .get_project(project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", project_id))?;

    let safe_name = if name.trim().is_empty() {
        "Skeleton".to_string()
    } else {
        name
    };

    if let Some(file) = emit_non_java_skeleton(
        kind,
        &project.namespace,
        &safe_name,
        &project.mod_loader,
        &project.minecraft_version,
    ) {
        return Ok(file);
    }

    Ok(emit_java_skeleton(
        kind,
        &project.namespace,
        &safe_name,
        &project.mod_loader,
        &project.minecraft_version,
    ))
}
