//! Disk <-> SQLite cache adapter.
//!
//! Per the architectural decision (2A): `studio.project.json` on disk is
//! the **authoritative** source of truth. The SQLite database is a
//! derived cache used for fast lookups, full-text search, and powering
//! the existing Tauri commands while higher layers are still being
//! built. If the cache and disk diverge, the disk wins.
//!
//! This module bridges the two:
//!
//!   * `convert_legacy_db_project` lifts a legacy `db::operations::Project`
//!     into a brand-new `StudioProject`. Used during the one-time
//!     migration when a user opens an old project that has no manifest
//!     file on disk yet.
//!
//!   * `apply_to_db_project` pushes a `StudioProject` back into a legacy
//!     `Project` row so existing CRUD code keeps working until Layer 2
//!     replaces it.
//!
//! Every conversion is **lossy in one direction**: the legacy DB row
//! has fewer fields than the new manifest. Round-tripping disk -> DB
//! -> disk loses things like `paths.generated`, `features`, etc. The
//! cache is, by design, allowed to forget; the manifest is not.

use uuid::Uuid;

use crate::db::operations::Project as LegacyProject;

use super::errors::{ProjectCoreError, Result};
use super::model::{
    BuildState, BuildStatus, Loader, Mappings, ProjectIdentity, ProjectMetadata, ProjectPaths,
    StudioProject, CURRENT_SCHEMA_VERSION,
};

/// Lift a legacy `Project` row into a fresh `StudioProject`. The caller
/// is responsible for then writing the result to disk via `saver` and
/// for keeping the DB row in sync (or for deleting it once Layer 2
/// adopts the new model).
///
/// `studio_version` should be the running app's version string, used to
/// stamp `studio.project.json`.
///
/// `project_root` is the on-disk directory where the project should
/// live. The returned model's `paths.root` is set to this path.
pub fn convert_legacy_db_project(
    legacy: &LegacyProject,
    studio_version: impl Into<String>,
    project_root: impl Into<String>,
) -> Result<StudioProject> {
    if legacy.namespace.trim().is_empty() {
        return Err(ProjectCoreError::LegacyMissingField { field: "namespace" });
    }
    if legacy.name.trim().is_empty() {
        return Err(ProjectCoreError::LegacyMissingField { field: "name" });
    }

    let mod_id = derive_mod_id(legacy);
    let loader = parse_loader(&legacy.mod_loader)?;
    let mappings = default_mappings_for(loader);
    let java_version = default_java_for(&legacy.minecraft_version);

    let now = chrono::Utc::now().to_rfc3339();
    let created = legacy.created_at.clone().unwrap_or_else(|| now.clone());
    let updated = legacy.updated_at.clone().unwrap_or_else(|| now.clone());

    Ok(StudioProject {
        schema_version: CURRENT_SCHEMA_VERSION,
        studio_version: studio_version.into(),
        project: ProjectIdentity {
            // Legacy DB used auto-incrementing rowids; we mint a stable
            // UUID for the disk model so it survives DB rebuilds.
            id: Uuid::new_v4().to_string(),
            name: legacy.name.clone(),
            mod_id,
            namespace: legacy.namespace.clone(),
            loader,
            minecraft_version: legacy.minecraft_version.clone(),
            java_version,
            mappings,
            description: legacy.description.clone(),
            author: if legacy.author.is_empty() {
                None
            } else {
                Some(legacy.author.clone())
            },
            mod_version: if legacy.mod_version.is_empty() {
                "1.0.0".into()
            } else {
                legacy.mod_version.clone()
            },
        },
        features: Vec::new(),
        dependencies: Vec::new(),
        paths: ProjectPaths {
            root: project_root.into(),
            source: "src/main/java".into(),
            resources: "src/main/resources".into(),
            generated: None,
            test: None,
        },
        build: BuildState {
            last_status: BuildStatus::Unknown,
            last_successful_build: None,
            last_error: None,
            build_count: legacy.build_count.max(0) as u32,
        },
        metadata: ProjectMetadata {
            created_at: created,
            updated_at: updated,
            is_archived: legacy.is_archived,
            tags: Vec::new(),
        },
    })
}

/// Push the relevant subset of a `StudioProject` back into a legacy
/// `Project` row so existing DB-backed commands keep working. The DB row
/// is intentionally narrower than the manifest — anything not
/// representable in the legacy schema (features, dependencies, paths,
/// generated dirs, …) is dropped on the floor. Disk remains the source
/// of truth.
pub fn apply_to_db_project(
    studio: &StudioProject,
    db_row: &mut LegacyProject,
) {
    db_row.name = studio.project.name.clone();
    db_row.description = studio.project.description.clone();
    db_row.minecraft_version = studio.project.minecraft_version.clone();
    db_row.mod_loader = studio.project.loader.as_str().to_owned();
    db_row.mod_version = studio.project.mod_version.clone();
    db_row.author = studio.project.author.clone().unwrap_or_default();
    db_row.namespace = studio.project.namespace.clone();
    db_row.build_count = studio.build.build_count.min(i32::MAX as u32) as i32;
    db_row.is_archived = studio.metadata.is_archived;
    // created_at / updated_at are managed by SQLite triggers; do not touch.
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Derive a valid `modId` from a legacy `Project`. Order of preference:
///   1. namespace's last segment if it is itself a valid mod id
///   2. project name slug-ified
///   3. fallback `unnamed_<short_uuid>`
fn derive_mod_id(legacy: &LegacyProject) -> String {
    if let Some(last) = legacy.namespace.rsplit('.').next() {
        let candidate = last.to_ascii_lowercase();
        if is_valid_mod_id(&candidate) {
            return candidate;
        }
    }
    let slug = slugify(&legacy.name);
    if is_valid_mod_id(&slug) {
        return slug;
    }
    format!(
        "unnamed_{}",
        Uuid::new_v4()
            .as_simple()
            .to_string()
            .chars()
            .take(8)
            .collect::<String>()
    )
}

fn slugify(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut last_was_underscore = false;
    for c in name.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
            last_was_underscore = false;
        } else if !last_was_underscore && !out.is_empty() {
            out.push('_');
            last_was_underscore = true;
        }
    }
    let trimmed = out.trim_matches('_').to_owned();
    // mod_id must start with a letter, not a digit.
    match trimmed.chars().next() {
        Some(c) if c.is_ascii_lowercase() => trimmed,
        Some(_) => format!("m_{trimmed}"),
        None => String::new(),
    }
}

fn is_valid_mod_id(s: &str) -> bool {
    let len = s.len();
    if !(2..=64).contains(&len) {
        return false;
    }
    let mut chars = s.chars();
    let first = chars.next().unwrap();
    if !first.is_ascii_lowercase() {
        return false;
    }
    chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

fn parse_loader(raw: &str) -> Result<Loader> {
    match raw.to_ascii_lowercase().as_str() {
        "fabric" => Ok(Loader::Fabric),
        "forge" => Ok(Loader::Forge),
        "neoforge" => Ok(Loader::Neoforge),
        "quilt" => Ok(Loader::Quilt),
        other => Err(ProjectCoreError::validation(format!(
            "legacy DB project has unknown mod_loader=`{other}`; cannot migrate"
        ))),
    }
}

fn default_mappings_for(loader: Loader) -> Mappings {
    match loader {
        Loader::Fabric | Loader::Quilt => Mappings::Yarn,
        Loader::Forge | Loader::Neoforge => Mappings::Mojmap,
    }
}

fn default_java_for(minecraft_version: &str) -> u32 {
    let parts: Vec<&str> = minecraft_version.split('.').collect();
    let minor: Option<u32> = parts.get(1).and_then(|p| p.parse().ok());
    match minor {
        Some(n) if n >= 21 => 21,
        Some(20) => 17,
        Some(n) if (18..=19).contains(&n) => 17,
        Some(17) => 16,
        _ => 8,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn legacy() -> LegacyProject {
        LegacyProject {
            id: Some(7),
            name: "Echoes of the Deep".into(),
            description: Some("A test mod".into()),
            minecraft_version: "1.21".into(),
            mod_loader: "fabric".into(),
            mod_version: "0.1.0".into(),
            author: "Akmal".into(),
            namespace: "com.akmal.eovs32".into(),
            build_count: 3,
            is_archived: false,
            created_at: Some("2025-01-01T00:00:00Z".into()),
            updated_at: Some("2025-06-01T00:00:00Z".into()),
        }
    }

    #[test]
    fn legacy_to_studio_uses_namespace_tail_as_mod_id() {
        let s = convert_legacy_db_project(&legacy(), "1.3.2", "/tmp/proj").unwrap();
        assert_eq!(s.project.mod_id, "eovs32");
        assert_eq!(s.project.namespace, "com.akmal.eovs32");
        assert_eq!(s.project.loader, Loader::Fabric);
        assert_eq!(s.project.mappings, Mappings::Yarn);
        assert_eq!(s.project.java_version, 21);
        assert_eq!(s.build.build_count, 3);
    }

    #[test]
    fn legacy_to_studio_falls_back_to_slug_when_namespace_tail_invalid() {
        let mut l = legacy();
        l.namespace = "com.akmal.X".into();
        let s = convert_legacy_db_project(&l, "1.3.2", "/tmp/proj").unwrap();
        // Namespace tail "X" is uppercase -> invalid as mod_id, so we
        // fall back to slug of name "Echoes of the Deep".
        assert_eq!(s.project.mod_id, "echoes_of_the_deep");
    }

    #[test]
    fn legacy_to_studio_rejects_empty_namespace() {
        let mut l = legacy();
        l.namespace = String::new();
        let err = convert_legacy_db_project(&l, "1.3.2", "/tmp/proj").unwrap_err();
        assert!(matches!(
            err,
            ProjectCoreError::LegacyMissingField { field: "namespace" }
        ));
    }

    #[test]
    fn studio_to_legacy_round_trip_subset() {
        let studio = convert_legacy_db_project(&legacy(), "1.3.2", "/tmp/proj").unwrap();
        let mut row = LegacyProject {
            id: Some(7),
            name: "OLD".into(),
            description: None,
            minecraft_version: "OLD".into(),
            mod_loader: "OLD".into(),
            mod_version: "0.0.0".into(),
            author: "OLD".into(),
            namespace: "OLD".into(),
            build_count: 0,
            is_archived: false,
            created_at: None,
            updated_at: None,
        };
        apply_to_db_project(&studio, &mut row);
        assert_eq!(row.name, "Echoes of the Deep");
        assert_eq!(row.mod_loader, "fabric");
        assert_eq!(row.namespace, "com.akmal.eovs32");
        assert_eq!(row.build_count, 3);
    }
}
