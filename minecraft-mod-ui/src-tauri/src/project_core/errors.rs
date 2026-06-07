//! Error type for the project_core layer.
//!
//! All public functions in this layer return `Result<_, ProjectCoreError>`.
//! The error variants are deliberately granular so callers can branch on
//! the failure mode (e.g. show a "schema upgrade needed" dialog vs. a
//! "file not found" toast).

use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProjectCoreError {
    /// The on-disk manifest file does not exist.
    #[error("studio.project.json not found at {path}")]
    NotFound { path: PathBuf },

    /// The manifest exists but could not be read from disk.
    #[error("failed to read project manifest at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    /// The manifest content is not syntactically valid JSON.
    #[error("project manifest at {path} is not valid JSON: {source}")]
    Json {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },

    /// The manifest is structurally valid JSON but does not match the
    /// expected schema (missing required field, unknown field, etc).
    #[error("project manifest schema violation at {path}: {message}")]
    Schema { path: PathBuf, message: String },

    /// The manifest passes structural validation but contains semantically
    /// invalid combinations — e.g. javaVersion=8 with minecraftVersion=1.21.
    #[error("project manifest semantic validation failed: {0}")]
    Validation(String),

    /// schemaVersion in the file is higher than this Studio build supports.
    /// The user has opened a project from a newer Studio.
    #[error(
        "project manifest at {path} has schemaVersion={file_version}, but this build only \
         supports up to schemaVersion={supported_version}. Please upgrade Studio."
    )]
    UnsupportedSchemaVersion {
        path: PathBuf,
        file_version: u32,
        supported_version: u32,
    },

    /// Migration from an older schemaVersion to the current one failed.
    #[error("failed to migrate project manifest from schemaVersion={from} to {to}: {message}")]
    Migration {
        from: u32,
        to: u32,
        message: String,
    },

    /// An attempt was made to import a legacy DB row (`db::operations::Project`)
    /// that lacked one of the fields required by the new schema (e.g. namespace
    /// is empty). Migration cannot proceed without user input.
    #[error("legacy DB project is missing required field for migration: {field}")]
    LegacyMissingField { field: &'static str },

    /// The directory passed to `WorkspaceManager::detect` does not look like
    /// a Studio project at all (no manifest, no recognisable mod layout).
    #[error("no Minecraft Mod Studio project detected at {path}")]
    NotAProject { path: PathBuf },

    /// The cache layer (SQLite) failed to keep up with disk truth. The disk
    /// is still authoritative; this is a soft failure.
    #[error("project cache (SQLite) error: {0}")]
    Cache(String),

    /// Snapshotting the project before a mutation failed. Mutations that
    /// require a backup will refuse to proceed when this happens.
    #[error("failed to create backup snapshot at {path}: {source}")]
    Backup {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
}

impl ProjectCoreError {
    /// Convenience constructor used by the validator.
    pub fn validation(msg: impl Into<String>) -> Self {
        ProjectCoreError::Validation(msg.into())
    }

    /// Convenience constructor used by the schema layer.
    pub fn schema(path: impl Into<PathBuf>, msg: impl Into<String>) -> Self {
        ProjectCoreError::Schema {
            path: path.into(),
            message: msg.into(),
        }
    }
}

/// Convenience `Result` alias for the layer.
pub type Result<T> = std::result::Result<T, ProjectCoreError>;
