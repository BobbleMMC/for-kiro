//! Atomically write `studio.project.json` to disk.
//!
//! The saver is the **only** entry point that writes the manifest file.
//! It guarantees:
//!   * The file is validated semantically before serialisation.
//!   * `metadata.updatedAt` is bumped to the current time.
//!   * The on-disk manifest is never half-written: we write to a sibling
//!     `studio.project.json.tmp` and rename. Crashes during write leave
//!     the previous good copy untouched.
//!
//! `paths.root` is intentionally NOT persisted as the absolute on-disk
//! path of the calling machine — the value is rewritten to a portable
//! relative form (`"."`) on save and re-derived on load. This keeps the
//! manifest portable across machines and survives `mv` / `cp -r`.

use std::path::{Path, PathBuf};

use super::errors::{ProjectCoreError, Result};
use super::model::{StudioProject, MANIFEST_FILE_NAME};
use super::validator;

/// Save `project` as `studio.project.json` inside `project_root`.
///
/// `project_root` MUST be a directory that exists. The saver does not
/// create intermediate directories — that's the caller's responsibility,
/// because directory creation is a workspace-level decision.
pub fn save_project(project: &mut StudioProject, project_root: impl AsRef<Path>) -> Result<PathBuf> {
    let dir = project_root.as_ref();
    if !dir.is_dir() {
        return Err(ProjectCoreError::Io {
            path: dir.to_path_buf(),
            source: std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "project root directory does not exist",
            ),
        });
    }

    // Defensive: validate semantically before touching the disk. A failed
    // save leaves the previous version intact.
    validator::validate(project)?;

    // Bump updatedAt and persist a portable root marker.
    project.touch();
    let original_root = std::mem::replace(&mut project.paths.root, ".".to_string());

    let final_path = dir.join(MANIFEST_FILE_NAME);
    let tmp_path = dir.join(format!("{MANIFEST_FILE_NAME}.tmp"));

    let write_result = (|| -> std::io::Result<()> {
        let json = serde_json::to_vec_pretty(project).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e)
        })?;
        std::fs::write(&tmp_path, &json)?;
        // Best-effort fsync of the temp file before rename. Ignored on
        // platforms / filesystems that don't support it.
        if let Ok(file) = std::fs::File::open(&tmp_path) {
            let _ = file.sync_all();
        }
        std::fs::rename(&tmp_path, &final_path)?;
        Ok(())
    })();

    // Restore the in-memory absolute root regardless of write outcome so
    // the caller can keep using the model.
    project.paths.root = original_root;

    write_result.map_err(|source| ProjectCoreError::Io {
        path: final_path.clone(),
        source,
    })?;

    Ok(final_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::model::*;
    use tempfile::TempDir;

    fn sample_project(root: &Path) -> StudioProject {
        let mut p = StudioProject::new_skeleton("1.3.2");
        p.project = ProjectIdentity {
            id: "11111111-2222-3333-4444-555555555555".into(),
            name: "Echoes".into(),
            mod_id: "echoes".into(),
            namespace: "com.akmal.echoes".into(),
            loader: Loader::Fabric,
            minecraft_version: "1.21".into(),
            java_version: 21,
            mappings: Mappings::Yarn,
            description: None,
            author: None,
            mod_version: "1.0.0".into(),
        };
        p.paths.root = root.to_string_lossy().into_owned();
        p
    }

    #[test]
    fn save_writes_manifest_and_normalises_root() {
        let tmp = TempDir::new().unwrap();
        let mut p = sample_project(tmp.path());
        let path = save_project(&mut p, tmp.path()).unwrap();

        assert!(path.exists(), "manifest should be written");
        let contents = std::fs::read_to_string(&path).unwrap();
        assert!(contents.contains("\"root\": \".\""),
            "saved root should be portable \".\", got:\n{contents}");
        // In-memory model should still see the absolute root after save.
        assert_eq!(p.paths.root, tmp.path().to_string_lossy());
    }

    #[test]
    fn save_refuses_when_directory_missing() {
        let mut p = sample_project(Path::new("/nonexistent/path/that/should/not/exist"));
        let err = save_project(&mut p, "/nonexistent/path/that/should/not/exist").unwrap_err();
        assert!(matches!(err, ProjectCoreError::Io { .. }));
    }
}
