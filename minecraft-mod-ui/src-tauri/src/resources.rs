//! Sidecar resource loader.
//!
//! At install time the bundler ships a `studio.bin` file (gzipped tar)
//! next to the executable plus a `manifest.json` describing its contents.
//! Keeping resources outside the binary lets us:
//!   * Ship a smaller installer (compressed once, not embedded as bytes)
//!   * Hot-patch templates / prompts without rebuilding the native binary
//!   * Lazy-load entries on first access
//!
//! The cache is built on first read and reused for the lifetime of the app.
//! Lookups are O(1) via a HashMap keyed by relative path.

use std::collections::HashMap;
use std::io::Read;
use std::path::PathBuf;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManifestEntry {
    pub path: String,
    pub size: u64,
    pub sha256: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manifest {
    pub version: u32,
    #[serde(rename = "generatedAt")]
    pub generated_at: String,
    pub format: String,
    #[serde(rename = "uncompressedSize")]
    pub uncompressed_size: u64,
    #[serde(rename = "compressedSize")]
    pub compressed_size: u64,
    #[serde(rename = "entryCount")]
    pub entry_count: u32,
    pub entries: Vec<ManifestEntry>,
}

pub struct ResourceBundle {
    pub manifest: Manifest,
    files: HashMap<String, Vec<u8>>,
}

#[derive(Debug, thiserror::Error)]
pub enum ResourceError {
    #[error("resource not found: {0}")]
    NotFound(String),
    #[error("bundle not loaded")]
    NotLoaded,
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
}

static BUNDLE: OnceLock<ResourceBundle> = OnceLock::new();

/// Load and parse the sidecar bundle. Called once on app startup.
/// `bin_path` and `manifest_path` are typically resolved by Tauri's
/// `path::resource_dir()` helper.
pub fn init(bin_path: PathBuf, manifest_path: PathBuf) -> Result<(), ResourceError> {
    let manifest_bytes = std::fs::read(&manifest_path)?;
    let manifest: Manifest = serde_json::from_slice(&manifest_bytes)?;

    let bin = std::fs::File::open(&bin_path)?;
    let gz = flate2::read::GzDecoder::new(bin);
    let mut tar = tar::Archive::new(gz);

    let mut files = HashMap::with_capacity(manifest.entries.len());
    for entry in tar.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.to_string_lossy().replace('\\', "/");
        let mut data = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut data)?;
        files.insert(path, data);
    }

    let _ = BUNDLE.set(ResourceBundle { manifest, files });
    Ok(())
}

/// Read a resource by relative path. Bytes are returned by reference into
/// the in-memory cache — no reallocation on every call.
pub fn read(path: &str) -> Result<&'static [u8], ResourceError> {
    let bundle = BUNDLE.get().ok_or(ResourceError::NotLoaded)?;
    bundle
        .files
        .get(path)
        .map(|v| v.as_slice())
        .ok_or_else(|| ResourceError::NotFound(path.to_owned()))
}

/// Read a resource as UTF-8 text.
pub fn read_text(path: &str) -> Result<String, ResourceError> {
    let bytes = read(path)?;
    Ok(String::from_utf8_lossy(bytes).into_owned())
}

/// List all available resource paths (handy for debugging / Settings UI).
pub fn list() -> Vec<String> {
    BUNDLE
        .get()
        .map(|b| b.manifest.entries.iter().map(|e| e.path.clone()).collect())
        .unwrap_or_default()
}
