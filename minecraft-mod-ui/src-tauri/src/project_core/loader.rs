//! Read `studio.project.json` from disk and deserialize into a `StudioProject`.
//!
//! The loader is the **only** entry point that reads the manifest file.
//! It performs three steps:
//!   1. Read the file (Io errors -> ProjectCoreError::Io)
//!   2. Parse JSON (syntax errors -> ProjectCoreError::Json)
//!   3. Deserialize into `StudioProject` with `deny_unknown_fields`
//!      (structural errors -> ProjectCoreError::Schema)
//!
//! After loading, the loader rewrites `paths.root` to the actual on-disk
//! location — never trust the value persisted in the file, because the
//! project may have been moved.
//!
//! Migration is applied transparently: if the file's `schemaVersion` is
//! older than `CURRENT_SCHEMA_VERSION`, the loader runs the migration
//! pipeline before returning. Files newer than this build are rejected
//! with `UnsupportedSchemaVersion`.

use std::path::{Path, PathBuf};

use super::errors::{ProjectCoreError, Result};
use super::migration;
use super::model::{StudioProject, CURRENT_SCHEMA_VERSION, MANIFEST_FILE_NAME};

/// Load and validate a project manifest.
///
/// `manifest_path` may point at:
///   * the manifest file itself (`/path/to/studio.project.json`), or
///   * a directory that contains the manifest at its root.
///
/// In both cases the project root is recorded as the directory containing
/// the manifest.
pub fn load_project(manifest_path: impl AsRef<Path>) -> Result<StudioProject> {
    let (file_path, root_dir) = resolve_manifest_path(manifest_path.as_ref())?;

    let bytes = std::fs::read(&file_path).map_err(|source| match source.kind() {
        std::io::ErrorKind::NotFound => ProjectCoreError::NotFound {
            path: file_path.clone(),
        },
        _ => ProjectCoreError::Io {
            path: file_path.clone(),
            source,
        },
    })?;

    // Step 1: parse as raw JSON so we can read schemaVersion before
    // committing to a typed deserialise. This lets older versions take
    // the migration path even if their shape no longer matches.
    let raw: serde_json::Value =
        serde_json::from_slice(&bytes).map_err(|source| ProjectCoreError::Json {
            path: file_path.clone(),
            source,
        })?;

    let file_version = read_schema_version(&raw, &file_path)?;
    if file_version > CURRENT_SCHEMA_VERSION {
        return Err(ProjectCoreError::UnsupportedSchemaVersion {
            path: file_path,
            file_version,
            supported_version: CURRENT_SCHEMA_VERSION,
        });
    }

    // Step 2: migrate if needed, then deserialise into the typed model.
    let migrated = migration::migrate_to_current(raw, file_version, &file_path)?;
    let mut project: StudioProject = serde_json::from_value(migrated).map_err(|source| {
        ProjectCoreError::Schema {
            path: file_path.clone(),
            message: format!("manifest does not match schemaVersion={CURRENT_SCHEMA_VERSION} shape: {source}"),
        }
    })?;

    // Step 3: rewrite paths.root to the actual filesystem location.
    project.paths.root = root_dir.to_string_lossy().into_owned();

    Ok(project)
}

/// Locate `studio.project.json` given either a file path or a directory.
/// Returns `(manifest_file_path, manifest_directory)`.
fn resolve_manifest_path(input: &Path) -> Result<(PathBuf, PathBuf)> {
    if input.is_file() {
        let dir = input
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from("."));
        return Ok((input.to_path_buf(), dir));
    }

    if input.is_dir() {
        let candidate = input.join(MANIFEST_FILE_NAME);
        if candidate.exists() {
            return Ok((candidate, input.to_path_buf()));
        }
        return Err(ProjectCoreError::NotFound { path: candidate });
    }

    // Path doesn't exist at all. Be specific about whether it looks like a
    // file path or a directory path so the caller can show a helpful error.
    if input.extension().is_some() {
        Err(ProjectCoreError::NotFound {
            path: input.to_path_buf(),
        })
    } else {
        Err(ProjectCoreError::NotFound {
            path: input.join(MANIFEST_FILE_NAME),
        })
    }
}

fn read_schema_version(raw: &serde_json::Value, file_path: &Path) -> Result<u32> {
    raw.get("schemaVersion")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .ok_or_else(|| ProjectCoreError::Schema {
            path: file_path.to_path_buf(),
            message: "manifest is missing required field `schemaVersion` (or it is not an integer)".into(),
        })
}
