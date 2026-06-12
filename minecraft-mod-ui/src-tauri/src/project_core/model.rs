//! Disk model of a Minecraft Mod Studio project.
//!
//! The shape mirrors `schemas/studio.project.schema.json` exactly. Every
//! field is `#[serde(rename_all = "camelCase")]` because the JSON manifest
//! is camelCase, but Rust idiom is snake_case.
//!
//! Layer 2 (Semantic Mod Model) will fill in the `features` and
//! `dependencies` vectors. In Layer 1 they are typed as opaque
//! `serde_json::Value` so the two layers can evolve independently without
//! one breaking the other every time a field is added.

use serde::{Deserialize, Serialize};

/// Current schemaVersion this Studio build writes. Bumped by Layer 1 only.
/// Migration logic in `migration.rs` knows how to lift older versions to
/// this number.
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

/// File name of the on-disk manifest. Always at the project root.
pub const MANIFEST_FILE_NAME: &str = "studio.project.json";

/// Top-level manifest. This is what gets serialised to `studio.project.json`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StudioProject {
    pub schema_version: u32,
    pub studio_version: String,
    pub project: ProjectIdentity,
    #[serde(default)]
    pub features: Vec<serde_json::Value>,
    #[serde(default)]
    pub dependencies: Vec<serde_json::Value>,
    pub paths: ProjectPaths,
    #[serde(default)]
    pub build: BuildState,
    pub metadata: ProjectMetadata,
}

/// "Who is this project?" — the stable identity bits.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectIdentity {
    /// Stable opaque id (UUID v4 by default). Survives renames, moves,
    /// and DB rebuilds.
    pub id: String,
    /// Human-readable project name.
    pub name: String,
    /// Minecraft mod id (lowercase a-z0-9_).
    pub mod_id: String,
    /// Java root package, e.g. `com.akmal.eovs32`.
    pub namespace: String,
    pub loader: Loader,
    pub minecraft_version: String,
    pub java_version: u32,
    pub mappings: Mappings,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    /// Mod's own SemVer. Defaults to `1.0.0` if absent.
    #[serde(default = "default_mod_version", skip_serializing_if = "is_default_mod_version")]
    pub mod_version: String,
}

fn default_mod_version() -> String {
    "1.0.0".into()
}
fn is_default_mod_version(v: &String) -> bool {
    v == "1.0.0"
}

/// Mod loader. Drives template selection, dependency catalog, Gradle layout.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Loader {
    Fabric,
    Forge,
    Neoforge,
    Quilt,
}

impl Loader {
    pub fn as_str(&self) -> &'static str {
        match self {
            Loader::Fabric => "fabric",
            Loader::Forge => "forge",
            Loader::Neoforge => "neoforge",
            Loader::Quilt => "quilt",
        }
    }
}

/// Mappings flavour. `validator.rs` enforces loader compatibility.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mappings {
    Yarn,
    Mojmap,
    Parchment,
}

impl Mappings {
    pub fn as_str(&self) -> &'static str {
        match self {
            Mappings::Yarn => "yarn",
            Mappings::Mojmap => "mojmap",
            Mappings::Parchment => "parchment",
        }
    }
}

/// On-disk paths. `root` is rewritten to the actual filesystem location on
/// every load — never trust the value persisted in the file.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectPaths {
    pub root: String,
    #[serde(default = "default_source")]
    pub source: String,
    #[serde(default = "default_resources")]
    pub resources: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generated: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub test: Option<String>,
}

fn default_source() -> String {
    "src/main/java".into()
}
fn default_resources() -> String {
    "src/main/resources".into()
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BuildState {
    #[serde(default)]
    pub last_status: BuildStatus,
    #[serde(default)]
    pub last_successful_build: Option<String>,
    #[serde(default)]
    pub last_error: Option<String>,
    #[serde(default)]
    pub build_count: u32,
}

impl Default for BuildState {
    fn default() -> Self {
        Self {
            last_status: BuildStatus::Unknown,
            last_successful_build: None,
            last_error: None,
            build_count: 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum BuildStatus {
    #[default]
    Unknown,
    Success,
    Failed,
    Running,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectMetadata {
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub is_archived: bool,
    #[serde(default)]
    pub tags: Vec<String>,
}

impl StudioProject {
    /// Builder for a fresh project. Returns a `StudioProject` with sane
    /// defaults; the caller is expected to fill in `id`, `name`, etc.
    /// Validation is _not_ performed here — call `validator::validate` after.
    pub fn new_skeleton(studio_version: impl Into<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            studio_version: studio_version.into(),
            project: ProjectIdentity {
                id: String::new(),
                name: String::new(),
                mod_id: String::new(),
                namespace: String::new(),
                loader: Loader::Fabric,
                minecraft_version: "1.21".into(),
                java_version: 21,
                mappings: Mappings::Yarn,
                description: None,
                author: None,
                mod_version: default_mod_version(),
            },
            features: Vec::new(),
            dependencies: Vec::new(),
            paths: ProjectPaths {
                root: String::new(),
                source: default_source(),
                resources: default_resources(),
                generated: None,
                test: None,
            },
            build: BuildState::default(),
            metadata: ProjectMetadata {
                created_at: now.clone(),
                updated_at: now,
                is_archived: false,
                tags: Vec::new(),
            },
        }
    }

    /// Update the `metadata.updatedAt` timestamp to "now". Call this from
    /// `saver` before serialising so the file always reflects the most
    /// recent write.
    pub fn touch(&mut self) {
        self.metadata.updated_at = chrono::Utc::now().to_rfc3339();
    }
}
