//! Integration test for `project_core::workspace::detect`. Uses the
//! `tests/fixtures/` mini-workspaces shipped in this PR.
//!
//! Why a separate file? Because `workspace::detect` is the surface that
//! Layer 2 / 4 / 7 all consult to figure out "is this a Studio project,
//! an existing Forge mod, or empty?". A regression here cascades.

use std::path::Path;

use app_lib::project_core::{detect, Loader, WorkspaceKind};

fn fixture(name: &str) -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(name)
}

#[test]
fn detects_studio_project_via_manifest() {
    let dir = fixture("studio_project");
    match detect(&dir) {
        WorkspaceKind::Studio { manifest_path } => {
            assert!(manifest_path.ends_with("studio.project.json"));
        }
        other => panic!("expected Studio, got {other:?}"),
    }
}

#[test]
fn detects_existing_fabric_mod() {
    let dir = fixture("existing_fabric_mod");
    assert_eq!(
        detect(&dir),
        WorkspaceKind::ExistingMod {
            loader_hint: Some(Loader::Fabric)
        }
    );
}

#[test]
fn empty_dir_is_empty() {
    let dir = fixture("empty_workspace");
    assert_eq!(detect(&dir), WorkspaceKind::Empty);
}
