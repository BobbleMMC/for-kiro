//! Semantic validation for `StudioProject`.
//!
//! Structural validation (required fields, unknown fields, primitive
//! types) is handled by `serde` deserialisation in `loader.rs`. This
//! module covers the rules that JSON Schema cannot express cleanly:
//!
//!   * Java version compatible with Minecraft version
//!   * Mappings flavour compatible with loader
//!   * `namespace` is a valid Java package
//!   * `modId` does not collide with reserved Minecraft / loader prefixes
//!   * Path strings are relative (not absolute), except for `paths.root`
//!
//! The validator is conservative: when in doubt, prefer warning the user
//! over silently allowing a build to fail in Gradle 30 minutes later.

use super::errors::{ProjectCoreError, Result};
use super::model::{Loader, Mappings, StudioProject};

/// Run all semantic checks. Returns `Ok(())` if the project is OK, or
/// `Err(ProjectCoreError::Validation)` with the **first** failure
/// description. Multi-error reporting is a Layer 13 (Validator) concern;
/// here we only need a fast pre-save guard.
pub fn validate(project: &StudioProject) -> Result<()> {
    validate_identity(project)?;
    validate_loader_combo(project)?;
    validate_paths(project)?;
    validate_features_dependencies(project)?;
    Ok(())
}

fn validate_identity(p: &StudioProject) -> Result<()> {
    let id = &p.project;

    if id.id.is_empty() {
        return Err(ProjectCoreError::validation("project.id is empty"));
    }
    if id.name.trim().is_empty() {
        return Err(ProjectCoreError::validation("project.name is empty"));
    }
    if !is_valid_mod_id(&id.mod_id) {
        return Err(ProjectCoreError::validation(format!(
            "project.modId `{}` is invalid: must match ^[a-z][a-z0-9_]{{1,63}}$",
            id.mod_id
        )));
    }
    if RESERVED_MOD_IDS.contains(&id.mod_id.as_str()) {
        return Err(ProjectCoreError::validation(format!(
            "project.modId `{}` is reserved by Minecraft / loader",
            id.mod_id
        )));
    }
    if !is_valid_namespace(&id.namespace) {
        return Err(ProjectCoreError::validation(format!(
            "project.namespace `{}` is not a valid Java package (need at least two segments, lowercase, dot-separated)",
            id.namespace
        )));
    }
    if !is_valid_minecraft_version(&id.minecraft_version) {
        return Err(ProjectCoreError::validation(format!(
            "project.minecraftVersion `{}` is not a recognised release version",
            id.minecraft_version
        )));
    }
    Ok(())
}

fn validate_loader_combo(p: &StudioProject) -> Result<()> {
    let id = &p.project;

    // Minecraft version -> minimum Java version.
    let mc_minor = parse_minor(&id.minecraft_version);
    let java_min = match mc_minor {
        Some(n) if n >= 21 => 21,
        Some(20) => 17,
        Some(n) if (18..=19).contains(&n) => 17,
        Some(17) => 16,
        _ => 8,
    };
    if id.java_version < java_min {
        return Err(ProjectCoreError::validation(format!(
            "javaVersion {} is too low for Minecraft {} (need >= {java_min})",
            id.java_version, id.minecraft_version
        )));
    }

    // Mappings <-> loader compatibility. The combinations below reflect
    // current ecosystem reality; Layer 5 (Compatibility Matrix) will
    // refine this when it lands.
    let bad_combo = match (id.loader, id.mappings) {
        // Yarn is a Fabric thing. Forge / NeoForge users almost always
        // use mojmap or parchment.
        (Loader::Forge | Loader::Neoforge, Mappings::Yarn) => true,
        _ => false,
    };
    if bad_combo {
        return Err(ProjectCoreError::validation(format!(
            "loader={} with mappings={} is not a supported combination",
            id.loader.as_str(),
            id.mappings.as_str()
        )));
    }

    Ok(())
}

fn validate_paths(p: &StudioProject) -> Result<()> {
    // root is allowed to be absolute (it's the live filesystem location
    // when loaded) or "." (when freshly saved).
    for (label, value) in [
        ("paths.source", &p.paths.source),
        ("paths.resources", &p.paths.resources),
    ]
    .into_iter()
    .chain(p.paths.generated.as_ref().map(|v| ("paths.generated", v)))
    .chain(p.paths.test.as_ref().map(|v| ("paths.test", v)))
    {
        if value.is_empty() {
            return Err(ProjectCoreError::validation(format!("{label} is empty")));
        }
        if std::path::Path::new(value).is_absolute() {
            return Err(ProjectCoreError::validation(format!(
                "{label} must be a path relative to project root, got `{value}`"
            )));
        }
        if value.contains("..") {
            return Err(ProjectCoreError::validation(format!(
                "{label} must not contain `..` segments, got `{value}`"
            )));
        }
    }
    Ok(())
}

fn validate_features_dependencies(p: &StudioProject) -> Result<()> {
    // Layer 1 only enforces that each entry has the bare minimum shape
    // required by the schema (an object with at least `id`). Layer 2 will
    // validate the full per-feature schema.
    for (i, feat) in p.features.iter().enumerate() {
        let obj = feat.as_object().ok_or_else(|| {
            ProjectCoreError::validation(format!("features[{i}] is not an object"))
        })?;
        if !obj.contains_key("id") {
            return Err(ProjectCoreError::validation(format!(
                "features[{i}] is missing `id`"
            )));
        }
        if !obj.contains_key("type") {
            return Err(ProjectCoreError::validation(format!(
                "features[{i}] is missing `type`"
            )));
        }
    }
    for (i, dep) in p.dependencies.iter().enumerate() {
        let obj = dep.as_object().ok_or_else(|| {
            ProjectCoreError::validation(format!("dependencies[{i}] is not an object"))
        })?;
        if !obj.contains_key("id") {
            return Err(ProjectCoreError::validation(format!(
                "dependencies[{i}] is missing `id`"
            )));
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers (kept private; tests live alongside)
// ---------------------------------------------------------------------------

fn is_valid_mod_id(s: &str) -> bool {
    let len = s.len();
    if !(2..=64).contains(&len) {
        return false;
    }
    let mut chars = s.chars();
    let first = chars.next().unwrap();
    if !first.is_ascii_lowercase() {
        return false;
    }
    chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

fn is_valid_namespace(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    let segments: Vec<&str> = s.split('.').collect();
    if segments.len() < 2 {
        return false;
    }
    segments.iter().all(|seg| {
        let mut chars = seg.chars();
        match chars.next() {
            Some(c) if c.is_ascii_lowercase() => {
                chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
            }
            _ => false,
        }
    })
}

fn is_valid_minecraft_version(s: &str) -> bool {
    let parts: Vec<&str> = s.split('.').collect();
    if !(2..=3).contains(&parts.len()) {
        return false;
    }
    if parts[0] != "1" {
        return false;
    }
    parts.iter().skip(1).all(|p| p.parse::<u32>().is_ok())
}

fn parse_minor(version: &str) -> Option<u32> {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() < 2 || parts[0] != "1" {
        return None;
    }
    parts[1].parse::<u32>().ok()
}

/// Mod ids that the loader / vanilla Minecraft already use. Picked
/// conservatively; can be extended.
const RESERVED_MOD_IDS: &[&str] = &[
    "minecraft",
    "forge",
    "fabric",
    "fabric_api",
    "fabric_loader",
    "fabricloader",
    "neoforge",
    "quilt",
    "mojang",
];

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project_core::model::*;

    fn ok_project() -> StudioProject {
        let mut p = StudioProject::new_skeleton("1.3.2");
        p.project.id = "uid".into();
        p.project.name = "Echoes".into();
        p.project.mod_id = "echoes".into();
        p.project.namespace = "com.akmal.echoes".into();
        p
    }

    #[test]
    fn good_project_validates() {
        validate(&ok_project()).unwrap();
    }

    #[test]
    fn rejects_uppercase_mod_id() {
        let mut p = ok_project();
        p.project.mod_id = "Echoes".into();
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }

    #[test]
    fn rejects_reserved_mod_id() {
        let mut p = ok_project();
        p.project.mod_id = "minecraft".into();
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }

    #[test]
    fn rejects_single_segment_namespace() {
        let mut p = ok_project();
        p.project.namespace = "echoes".into();
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }

    #[test]
    fn rejects_yarn_with_forge() {
        let mut p = ok_project();
        p.project.loader = Loader::Forge;
        p.project.mappings = Mappings::Yarn;
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }

    #[test]
    fn rejects_java_8_on_1_21() {
        let mut p = ok_project();
        p.project.minecraft_version = "1.21".into();
        p.project.java_version = 8;
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }

    #[test]
    fn rejects_absolute_source_path() {
        let mut p = ok_project();
        p.paths.source = "/abs/src/main/java".into();
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }

    #[test]
    fn rejects_dotdot_in_paths() {
        let mut p = ok_project();
        p.paths.source = "src/../etc".into();
        assert!(matches!(validate(&p), Err(ProjectCoreError::Validation(_))));
    }
}
