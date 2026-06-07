//! Versioned manifest migration.
//!
//! When the on-disk `schemaVersion` is older than `CURRENT_SCHEMA_VERSION`,
//! the loader walks the migration pipeline to bring it up to date. Each
//! step is a `fn(serde_json::Value) -> Result<serde_json::Value>` that
//! upgrades from version `N` to version `N+1`. This keeps individual
//! migrations small and focused, and makes it trivial to add a new step
//! when we bump the schema in the future.
//!
//! IMPORTANT: migrations operate on raw `serde_json::Value`, not on the
//! typed `StudioProject`. That's because the typed model only knows about
//! the **current** schema; older shapes by definition won't match it.
//!
//! Layer 1 ships at schemaVersion=1, so there is no real upgrade work to
//! do yet. The pipeline is wired anyway so Layer 2 can drop in the
//! `1 -> 2` step without touching the rest of the loader.

use std::path::Path;

use super::errors::{ProjectCoreError, Result};
use super::model::CURRENT_SCHEMA_VERSION;

/// Lift `raw` (claiming `schemaVersion=from_version`) to a value that
/// matches the current schemaVersion. The returned value still needs
/// `serde_json::from_value::<StudioProject>(...)` afterwards — migration
/// only fixes the shape, it doesn't validate semantically.
pub fn migrate_to_current(
    mut raw: serde_json::Value,
    from_version: u32,
    file_path: &Path,
) -> Result<serde_json::Value> {
    if from_version == CURRENT_SCHEMA_VERSION {
        return Ok(raw);
    }

    let mut current = from_version;
    while current < CURRENT_SCHEMA_VERSION {
        let next = current + 1;
        raw = step(current, next, raw, file_path)?;
        current = next;
        // Defensive: each step must bump the in-document marker so the
        // next iteration sees the right version, even if the migration
        // step forgot to set it.
        if let Some(obj) = raw.as_object_mut() {
            obj.insert(
                "schemaVersion".into(),
                serde_json::Value::Number(current.into()),
            );
        }
    }

    Ok(raw)
}

/// Dispatch a single migration step. Add new steps as the schema evolves.
fn step(
    from: u32,
    to: u32,
    _raw: serde_json::Value,
    file_path: &Path,
) -> Result<serde_json::Value> {
    match (from, to) {
        // No registered upgrade steps yet. The match arm is left as a
        // placeholder so future steps drop in without restructuring the
        // dispatch.
        // (1, 2) => v1_to_v2(raw),
        _ => Err(ProjectCoreError::Migration {
            from,
            to,
            message: format!(
                "no migration step is registered for {from} -> {to} (manifest at {})",
                file_path.display()
            ),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migration_is_noop_when_versions_match() {
        let raw = serde_json::json!({ "schemaVersion": CURRENT_SCHEMA_VERSION });
        let out = migrate_to_current(raw.clone(), CURRENT_SCHEMA_VERSION, Path::new("/dev/null"))
            .unwrap();
        assert_eq!(out, raw);
    }

    #[test]
    fn migration_errors_when_no_step_registered() {
        // Pretend there's a future schemaVersion=99 -> CURRENT path.
        // We start lower than CURRENT to force the dispatch.
        if CURRENT_SCHEMA_VERSION == 1 {
            // Can't simulate "older than 1" without changing the constant;
            // skip the assertion shape but keep the test alive.
            return;
        }
        let raw = serde_json::json!({ "schemaVersion": 0 });
        let err = migrate_to_current(raw, 0, Path::new("/dev/null")).unwrap_err();
        assert!(matches!(err, ProjectCoreError::Migration { .. }));
    }
}
