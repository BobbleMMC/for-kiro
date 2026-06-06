//! Dependency-resolver Tauri commands.
//!
//! `list_dependencies` returns the full known-dependency catalog so the
//! frontend can render a picker, and `resolve_dependency` returns a
//! ready-to-paste Gradle snippet for a given (id, mc_version, loader).

use crate::feature_system::dependency_resolver::{
    list_known, resolve, DependencyInfo, ResolvedDependency,
};

#[tauri::command]
pub async fn list_dependencies() -> Result<Vec<DependencyInfo>, String> {
    Ok(list_known())
}

#[tauri::command]
pub async fn resolve_dependency(
    id: String,
    mc_version: String,
    loader: String,
) -> Result<ResolvedDependency, String> {
    resolve(&id, &mc_version, &loader)
        .ok_or_else(|| format!("Unknown dependency id: {}", id))
}
