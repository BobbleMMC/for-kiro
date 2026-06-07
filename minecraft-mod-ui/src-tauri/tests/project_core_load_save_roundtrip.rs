//! End-to-end round-trip: typed model -> save -> load -> typed model.
//!
//! These tests are deliberately black-box: they touch only the public API
//! of `project_core` (model + loader + saver), with no peeking at module
//! internals. If we ever rework the on-disk shape, these tests are
//! exactly the regression net we want.

use std::path::Path;

use app_lib::project_core::{
    load_project, save_project, Loader, Mappings, ProjectIdentity, StudioProject,
};

fn fresh_project(root: &Path) -> StudioProject {
    let mut p = StudioProject::new_skeleton("1.3.2");
    p.project = ProjectIdentity {
        id: "uid-roundtrip".into(),
        name: "Echoes of the Deep".into(),
        mod_id: "echoes_deep".into(),
        namespace: "com.akmal.echoes_deep".into(),
        loader: Loader::Fabric,
        minecraft_version: "1.21".into(),
        java_version: 21,
        mappings: Mappings::Yarn,
        description: Some("A sample test project".into()),
        author: Some("Akmal".into()),
        mod_version: "1.0.0".into(),
    };
    p.paths.root = root.to_string_lossy().into_owned();
    p
}

#[test]
fn round_trip_preserves_identity_fields() {
    let tmp = tempfile::TempDir::new().unwrap();
    let mut original = fresh_project(tmp.path());
    save_project(&mut original, tmp.path()).unwrap();

    let reloaded = load_project(tmp.path()).unwrap();

    // Identity fields must survive byte-for-byte.
    assert_eq!(reloaded.project.id, original.project.id);
    assert_eq!(reloaded.project.name, original.project.name);
    assert_eq!(reloaded.project.mod_id, original.project.mod_id);
    assert_eq!(reloaded.project.namespace, original.project.namespace);
    assert_eq!(reloaded.project.loader, original.project.loader);
    assert_eq!(
        reloaded.project.minecraft_version,
        original.project.minecraft_version
    );
    assert_eq!(reloaded.project.java_version, original.project.java_version);
    assert_eq!(reloaded.project.mappings, original.project.mappings);

    // schemaVersion must round-trip exactly.
    assert_eq!(reloaded.schema_version, original.schema_version);
}

#[test]
fn round_trip_rewrites_paths_root_to_absolute() {
    let tmp = tempfile::TempDir::new().unwrap();
    let mut original = fresh_project(tmp.path());
    save_project(&mut original, tmp.path()).unwrap();

    let reloaded = load_project(tmp.path()).unwrap();

    // Saver should have persisted "." to disk, but loader should rewrite
    // back to the actual filesystem path.
    let raw = std::fs::read_to_string(tmp.path().join("studio.project.json")).unwrap();
    assert!(
        raw.contains("\"root\": \".\""),
        "saved manifest must use relative root, got:\n{raw}"
    );
    assert_eq!(reloaded.paths.root, tmp.path().to_string_lossy());
}

#[test]
fn loader_accepts_directory_or_file_path() {
    let tmp = tempfile::TempDir::new().unwrap();
    let mut original = fresh_project(tmp.path());
    save_project(&mut original, tmp.path()).unwrap();

    let by_dir = load_project(tmp.path()).unwrap();
    let by_file = load_project(tmp.path().join("studio.project.json")).unwrap();
    assert_eq!(by_dir, by_file);
}

#[test]
fn loader_errors_on_missing_manifest() {
    let tmp = tempfile::TempDir::new().unwrap();
    let err = load_project(tmp.path()).unwrap_err();
    assert!(matches!(
        err,
        app_lib::project_core::ProjectCoreError::NotFound { .. }
    ));
}

#[test]
fn loader_errors_on_corrupt_json() {
    let tmp = tempfile::TempDir::new().unwrap();
    std::fs::write(
        tmp.path().join("studio.project.json"),
        b"{ this is not json",
    )
    .unwrap();
    let err = load_project(tmp.path()).unwrap_err();
    assert!(matches!(
        err,
        app_lib::project_core::ProjectCoreError::Json { .. }
    ));
}

#[test]
fn loader_errors_on_unknown_field() {
    let tmp = tempfile::TempDir::new().unwrap();
    let bad = serde_json::json!({
        "schemaVersion": 1,
        "studioVersion": "1.3.2",
        "project": {
            "id": "x",
            "name": "x",
            "modId": "echoes",
            "namespace": "com.x.y",
            "loader": "fabric",
            "minecraftVersion": "1.21",
            "javaVersion": 21,
            "mappings": "yarn"
        },
        "paths": {
            "root": ".",
            "source": "src/main/java",
            "resources": "src/main/resources"
        },
        "metadata": {
            "createdAt": "2025-06-01T00:00:00Z",
            "updatedAt": "2025-06-01T00:00:00Z"
        },
        "thisFieldShouldNotBeAllowed": 42
    });
    std::fs::write(
        tmp.path().join("studio.project.json"),
        serde_json::to_vec_pretty(&bad).unwrap(),
    )
    .unwrap();
    let err = load_project(tmp.path()).unwrap_err();
    assert!(matches!(
        err,
        app_lib::project_core::ProjectCoreError::Schema { .. }
    ));
}

#[test]
fn loader_errors_on_future_schema_version() {
    let tmp = tempfile::TempDir::new().unwrap();
    let raw = serde_json::json!({
        "schemaVersion": 9999,
        "studioVersion": "99.0.0"
    });
    std::fs::write(
        tmp.path().join("studio.project.json"),
        serde_json::to_vec_pretty(&raw).unwrap(),
    )
    .unwrap();
    let err = load_project(tmp.path()).unwrap_err();
    match err {
        app_lib::project_core::ProjectCoreError::UnsupportedSchemaVersion {
            file_version,
            supported_version,
            ..
        } => {
            assert_eq!(file_version, 9999);
            assert!(supported_version < 9999);
        }
        other => panic!("expected UnsupportedSchemaVersion, got {other:?}"),
    }
}
