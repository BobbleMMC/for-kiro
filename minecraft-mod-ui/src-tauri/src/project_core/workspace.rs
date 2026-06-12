//! Workspace detection.
//!
//! A "workspace" is a directory on disk that *might* be a Minecraft Mod
//! Studio project. The detector answers three questions:
//!
//!   1. Does this directory contain a `studio.project.json`?
//!      -> `WorkspaceKind::Studio` (load via `loader::load_project`)
//!   2. Does it look like an existing Fabric/Forge/NeoForge mod project
//!      that hasn't been touched by Studio yet?
//!      -> `WorkspaceKind::ExistingMod { loader_hint }`
//!   3. Is it just an empty / unrelated directory?
//!      -> `WorkspaceKind::Empty`
//!
//! The detector NEVER mutates the workspace. Conversion of an
//! `ExistingMod` into a Studio project is an explicit subsequent step
//! (Layer 2 / future), not something we do silently.
//!
//! Layer 1 only needs detection; conversion logic will land alongside the
//! Semantic Mod Model in Layer 2.

use std::path::{Path, PathBuf};

use super::model::{Loader, MANIFEST_FILE_NAME};

/// What kind of thing lives at this directory.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WorkspaceKind {
    /// A Studio-managed project: `studio.project.json` is present.
    Studio { manifest_path: PathBuf },

    /// An existing mod project that Studio hasn't taken over yet. The
    /// `loader_hint` is the loader we *guess* based on filesystem
    /// markers; it may be wrong and the user should confirm.
    ExistingMod { loader_hint: Option<Loader> },

    /// Nothing recognisable. Could be an empty dir, a generic Gradle
    /// project, etc.
    Empty,
}

/// Run detection at `dir`. The path must exist and be a directory; if
/// not, this returns `WorkspaceKind::Empty`.
pub fn detect(dir: impl AsRef<Path>) -> WorkspaceKind {
    let dir = dir.as_ref();
    if !dir.is_dir() {
        return WorkspaceKind::Empty;
    }

    let manifest = dir.join(MANIFEST_FILE_NAME);
    if manifest.is_file() {
        return WorkspaceKind::Studio {
            manifest_path: manifest,
        };
    }

    if let Some(loader_hint) = guess_loader(dir) {
        return WorkspaceKind::ExistingMod {
            loader_hint: Some(loader_hint),
        };
    }

    if looks_like_gradle_project(dir) {
        return WorkspaceKind::ExistingMod { loader_hint: None };
    }

    WorkspaceKind::Empty
}

/// File markers that strongly suggest a particular loader. Order matters:
/// we prefer the most specific marker first.
fn guess_loader(dir: &Path) -> Option<Loader> {
    // Fabric: src/main/resources/fabric.mod.json
    if has_file(dir, "src/main/resources/fabric.mod.json") {
        return Some(Loader::Fabric);
    }
    // Quilt: src/main/resources/quilt.mod.json
    if has_file(dir, "src/main/resources/quilt.mod.json") {
        return Some(Loader::Quilt);
    }
    // NeoForge: src/main/resources/META-INF/neoforge.mods.toml
    if has_file(dir, "src/main/resources/META-INF/neoforge.mods.toml") {
        return Some(Loader::Neoforge);
    }
    // Forge: src/main/resources/META-INF/mods.toml (1.13+)
    //         or  src/main/resources/mcmod.info (legacy)
    if has_file(dir, "src/main/resources/META-INF/mods.toml")
        || has_file(dir, "src/main/resources/mcmod.info")
    {
        return Some(Loader::Forge);
    }
    None
}

fn looks_like_gradle_project(dir: &Path) -> bool {
    has_file(dir, "build.gradle")
        || has_file(dir, "build.gradle.kts")
        || has_file(dir, "settings.gradle")
        || has_file(dir, "settings.gradle.kts")
}

fn has_file(dir: &Path, rel: &str) -> bool {
    dir.join(rel).is_file()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn touch(dir: &Path, rel: &str) {
        let path = dir.join(rel);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, b"").unwrap();
    }

    #[test]
    fn detects_studio_when_manifest_present() {
        let tmp = TempDir::new().unwrap();
        touch(tmp.path(), "studio.project.json");
        match detect(tmp.path()) {
            WorkspaceKind::Studio { manifest_path } => {
                assert!(manifest_path.ends_with("studio.project.json"));
            }
            other => panic!("expected Studio, got {other:?}"),
        }
    }

    #[test]
    fn detects_fabric_via_fabric_mod_json() {
        let tmp = TempDir::new().unwrap();
        touch(tmp.path(), "src/main/resources/fabric.mod.json");
        assert_eq!(
            detect(tmp.path()),
            WorkspaceKind::ExistingMod {
                loader_hint: Some(Loader::Fabric)
            }
        );
    }

    #[test]
    fn detects_neoforge_via_neoforge_mods_toml() {
        let tmp = TempDir::new().unwrap();
        touch(tmp.path(), "src/main/resources/META-INF/neoforge.mods.toml");
        assert_eq!(
            detect(tmp.path()),
            WorkspaceKind::ExistingMod {
                loader_hint: Some(Loader::Neoforge)
            }
        );
    }

    #[test]
    fn detects_forge_via_mods_toml() {
        let tmp = TempDir::new().unwrap();
        touch(tmp.path(), "src/main/resources/META-INF/mods.toml");
        assert_eq!(
            detect(tmp.path()),
            WorkspaceKind::ExistingMod {
                loader_hint: Some(Loader::Forge)
            }
        );
    }

    #[test]
    fn detects_unknown_loader_when_only_gradle() {
        let tmp = TempDir::new().unwrap();
        touch(tmp.path(), "build.gradle");
        assert_eq!(
            detect(tmp.path()),
            WorkspaceKind::ExistingMod { loader_hint: None }
        );
    }

    #[test]
    fn empty_dir_returns_empty() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(detect(tmp.path()), WorkspaceKind::Empty);
    }

    #[test]
    fn nonexistent_dir_returns_empty() {
        assert_eq!(
            detect(Path::new("/this/does/not/exist/at/all")),
            WorkspaceKind::Empty
        );
    }
}
