//! # project_core — Layer 1 of the Minecraft Mod Studio architecture
//!
//! This layer owns project identity. Every higher layer (Semantic Mod
//! Model, Version Resolver, Dependency Resolver, Validator, Build Runner,
//! …) consults `project_core` to answer the question "what is this
//! project, and where does it live?".
//!
//! ## Source of truth
//!
//! The on-disk file `studio.project.json` at the project root is the
//! authoritative description of a project. The SQLite database is a
//! derived cache — useful for fast lookups while older code is still
//! around, but never the final word. If the cache and disk disagree,
//! the disk wins.
//!
//! ## Module layout
//!
//! * [`model`]       — typed [`StudioProject`] with sub-structs
//! * [`schema`]      — embedded JSON Schema bytes + accessors
//! * [`loader`]      — read & parse `studio.project.json`
//! * [`saver`]       — atomically write `studio.project.json`
//! * [`validator`]   — semantic checks beyond JSON Schema
//! * [`migration`]   — versioned upgrades between `schemaVersion` numbers
//! * [`workspace`]   — detect Studio / existing-mod / empty directories
//! * [`index_cache`] — lift legacy DB rows into [`StudioProject`] and back
//! * [`errors`]      — [`ProjectCoreError`] and `Result<T>` alias

pub mod errors;
pub mod index_cache;
pub mod loader;
pub mod migration;
pub mod model;
pub mod saver;
pub mod schema;
pub mod validator;
pub mod workspace;

// Re-export the most-used items so call sites can write
// `use crate::project_core::StudioProject;` without traversing modules.
pub use errors::{ProjectCoreError, Result};
pub use loader::load_project;
pub use model::{
    BuildState, BuildStatus, Loader, Mappings, ProjectIdentity, ProjectMetadata, ProjectPaths,
    StudioProject, CURRENT_SCHEMA_VERSION, MANIFEST_FILE_NAME,
};
pub use saver::save_project;
pub use validator::validate;
pub use workspace::{detect, WorkspaceKind};
