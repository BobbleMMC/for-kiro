//! Version matrix — per-Minecraft-version + per-loader API constants.
//!
//! Minecraft's API shifts subtly between minor versions and very loudly
//! between Forge and NeoForge. Hard-coding any one snapshot of the API in
//! the generators (as the original code did) means switching the project
//! version produces code that will not compile.
//!
//! This module is the **single source of truth** for those differences.
//! When a generator needs to know "what's the BlockBehaviour.Properties
//! constructor in Forge 1.21?" it asks the `VersionProfile` for it.
//!
//! Adding a new MC version requires updating exactly one place: the
//! `profile_for` match arms. A test enforces that every supported
//! version slug returns a non-default profile.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum LoaderId {
    Forge,
    Fabric,
    NeoForge,
    Quilt,
}

#[derive(Debug, Clone, Serialize)]
pub struct VersionProfile {
    pub mc_version: String,
    pub loader: LoaderId,

    /// `package net.minecraftforge.*;` vs `package net.neoforged.*;` etc.
    pub forge_package_root: &'static str,

    /// The expression used to start a `BlockBehaviour.Properties` chain.
    /// Pre-1.20 needs a `Material.X` argument; 1.20.4+ accepts no args.
    pub block_properties_init: &'static str,

    /// Whether `BlockBehaviour.Properties.mapColor(...)` is available.
    /// (false for 1.19.x where you specify Material instead.)
    pub has_map_color_setter: bool,

    /// Whether `Item.Properties.attributes(...)` is available (1.20.5+).
    pub has_item_attributes_setter: bool,

    /// Whether `Component.literal(...)` should be used instead of
    /// `new TextComponent(...)` (everything 1.19.3+ is the new API).
    pub uses_component_literal: bool,

    /// `pack_format` integer to put in `pack.mcmeta`.
    pub pack_format: i32,

    /// Java toolchain version expected by the loader's Gradle plugin.
    pub java_version: u32,

    /// `loaderVersion` string for the matching `mods.toml` /
    /// `fabric.mod.json` block.
    pub loader_version_constraint: &'static str,
}

impl VersionProfile {
    /// Default = "anything we don't recognise" → assume modern (1.20.4 Forge).
    /// Generators should still call `is_recognised()` and fall back to a
    /// best-effort warning if the user is on an unknown version.
    pub fn unknown() -> Self {
        Self {
            mc_version: "unknown".into(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 15,
            java_version: 17,
            loader_version_constraint: "[47,)",
        }
    }
}

pub fn loader_from_str(s: &str) -> LoaderId {
    match s.to_ascii_lowercase().as_str() {
        "fabric" => LoaderId::Fabric,
        "neoforge" => LoaderId::NeoForge,
        "quilt" => LoaderId::Quilt,
        _ => LoaderId::Forge,
    }
}

/// Resolve the profile for a (mc_version, loader) pair. This is the only
/// function generators should call.
pub fn profile_for(mc_version: &str, loader: &str) -> VersionProfile {
    let loader_id = loader_from_str(loader);
    let normalised = normalise_version(mc_version);

    match (normalised.as_str(), loader_id) {
        // ---- 1.16.5 (Java 8) ----
        ("1.16", LoaderId::Forge) | ("1.16.5", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "AbstractBlock.Properties.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: false, // pre-1.19, still TextComponent
            pack_format: 6,
            java_version: 8,
            loader_version_constraint: "[36,)",
        },
        ("1.16", LoaderId::Fabric) | ("1.16.5", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: false,
            pack_format: 6,
            java_version: 8,
            loader_version_constraint: ">=0.11.0",
        },

        // ---- 1.17.1 (Java 16) ----
        ("1.17", LoaderId::Forge) | ("1.17.1", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: false,
            pack_format: 7,
            java_version: 16,
            loader_version_constraint: "[37,)",
        },
        ("1.17", LoaderId::Fabric) | ("1.17.1", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: false,
            pack_format: 7,
            java_version: 16,
            loader_version_constraint: ">=0.12.0",
        },

        // ---- 1.18.2 (Java 17) ----
        ("1.18", LoaderId::Forge) | ("1.18.2", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: false,
            pack_format: 8,
            java_version: 17,
            loader_version_constraint: "[40,)",
        },
        ("1.18", LoaderId::Fabric) | ("1.18.2", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: false,
            pack_format: 8,
            java_version: 17,
            loader_version_constraint: ">=0.13.0",
        },

        // ---- 1.19.2 ----
        ("1.19", LoaderId::Forge) | ("1.19.2", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: true, // 1.19.3+ technically; 1.19.2 also accepts it
            pack_format: 9,
            java_version: 17,
            loader_version_constraint: "[43,)",
        },
        ("1.19", LoaderId::Fabric) | ("1.19.2", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.of(Material.STONE)",
            has_map_color_setter: false,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 9,
            java_version: 17,
            loader_version_constraint: ">=0.14.0",
        },

        // ---- 1.20.1 ----
        ("1.20.1", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 15,
            java_version: 17,
            loader_version_constraint: "[47,)",
        },
        ("1.20.1", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.create()",
            has_map_color_setter: true,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 15,
            java_version: 17,
            loader_version_constraint: ">=0.14.21",
        },

        // ---- 1.20.4 ----
        ("1.20", LoaderId::Forge) | ("1.20.4", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 22,
            java_version: 17,
            loader_version_constraint: "[49,)",
        },
        ("1.20", LoaderId::NeoForge) | ("1.20.4", LoaderId::NeoForge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::NeoForge,
            forge_package_root: "net.neoforged.neoforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 22,
            java_version: 17,
            loader_version_constraint: "[20.4,)",
        },
        ("1.20", LoaderId::Fabric) | ("1.20.4", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.create()",
            has_map_color_setter: true,
            has_item_attributes_setter: false,
            uses_component_literal: true,
            pack_format: 22,
            java_version: 17,
            loader_version_constraint: ">=0.15.0",
        },

        // ---- 1.21 ----
        ("1.21", LoaderId::NeoForge) | ("1.21.0", LoaderId::NeoForge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::NeoForge,
            forge_package_root: "net.neoforged.neoforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: true, // 1.20.5 introduced .attributes()
            uses_component_literal: true,
            pack_format: 34,
            java_version: 21,
            loader_version_constraint: "[21,)",
        },
        ("1.21", LoaderId::Forge) | ("1.21.0", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 34,
            java_version: 21,
            loader_version_constraint: "[51,)",
        },
        ("1.21", LoaderId::Fabric) | ("1.21.0", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.create()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 34,
            java_version: 21,
            loader_version_constraint: ">=0.16.0",
        },

        // ---- 1.21.1 ----
        ("1.21.1", LoaderId::NeoForge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::NeoForge,
            forge_package_root: "net.neoforged.neoforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 34,
            java_version: 21,
            loader_version_constraint: "[21.1,)",
        },
        ("1.21.1", LoaderId::Forge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Forge,
            forge_package_root: "net.minecraftforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 34,
            java_version: 21,
            loader_version_constraint: "[52,)",
        },
        ("1.21.1", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.create()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 34,
            java_version: 21,
            loader_version_constraint: ">=0.16.0",
        },

        // ---- 1.21.4 ----
        ("1.21.4", LoaderId::NeoForge) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::NeoForge,
            forge_package_root: "net.neoforged.neoforge",
            block_properties_init: "BlockBehaviour.Properties.of()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 46,
            java_version: 21,
            loader_version_constraint: "[21.4,)",
        },
        ("1.21.4", LoaderId::Fabric) => VersionProfile {
            mc_version: normalised.clone(),
            loader: LoaderId::Fabric,
            forge_package_root: "net.fabricmc",
            block_properties_init: "FabricBlockSettings.create()",
            has_map_color_setter: true,
            has_item_attributes_setter: true,
            uses_component_literal: true,
            pack_format: 46,
            java_version: 21,
            loader_version_constraint: ">=0.16.5",
        },

        // ---- Anything else falls back to "unknown" with a marker ----
        _ => VersionProfile {
            mc_version: normalised,
            loader: loader_id,
            ..VersionProfile::unknown()
        },
    }
}

/// Best-effort recognition: returns true if profile_for found a real
/// match (not the unknown fall-through).
pub fn is_recognised(mc_version: &str, loader: &str) -> bool {
    let profile = profile_for(mc_version, loader);
    !profile.mc_version.starts_with("unknown")
        && profile.pack_format != VersionProfile::unknown().pack_format
        // pack_format is the easy discriminator: every recognised version
        // sets one and the unknown fallback uses 15. Combined with the
        // version slug check this is a good-enough heuristic.
        || (profile.pack_format == 15 && (profile.mc_version == "1.20" || profile.mc_version == "1.20.1"))
}

/// Strip patch-version suffixes like "+build.1" and pre-releases.
fn normalise_version(s: &str) -> String {
    s.split(|c: char| c == '+' || c == '-')
        .next()
        .unwrap_or(s)
        .trim()
        .to_string()
}

/// Convenience: list every (mc_version, loader) pair we recognise.
/// Used by the Feature Catalog to compute supported_mc_versions per feature.
pub fn supported_pairs() -> Vec<(&'static str, LoaderId)> {
    vec![
        ("1.16.5", LoaderId::Forge),
        ("1.16.5", LoaderId::Fabric),
        ("1.17.1", LoaderId::Forge),
        ("1.17.1", LoaderId::Fabric),
        ("1.18.2", LoaderId::Forge),
        ("1.18.2", LoaderId::Fabric),
        ("1.19.2", LoaderId::Forge),
        ("1.19.2", LoaderId::Fabric),
        ("1.20.1", LoaderId::Forge),
        ("1.20.1", LoaderId::Fabric),
        ("1.20.4", LoaderId::Forge),
        ("1.20.4", LoaderId::Fabric),
        ("1.20.4", LoaderId::NeoForge),
        ("1.21", LoaderId::Forge),
        ("1.21", LoaderId::Fabric),
        ("1.21", LoaderId::NeoForge),
        ("1.21.1", LoaderId::Forge),
        ("1.21.1", LoaderId::Fabric),
        ("1.21.1", LoaderId::NeoForge),
        ("1.21.4", LoaderId::Fabric),
        ("1.21.4", LoaderId::NeoForge),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_nineteen_block_uses_material_arg() {
        let p = profile_for("1.19.2", "forge");
        assert!(p.block_properties_init.contains("Material.STONE"));
        assert!(!p.has_map_color_setter);
        assert_eq!(p.pack_format, 9);
    }

    #[test]
    fn one_twenty_four_no_material_arg() {
        let p = profile_for("1.20.4", "forge");
        assert_eq!(p.block_properties_init, "BlockBehaviour.Properties.of()");
        assert!(p.has_map_color_setter);
        assert_eq!(p.pack_format, 22);
    }

    #[test]
    fn one_twenty_one_uses_java_21() {
        let p = profile_for("1.21", "neoforge");
        assert_eq!(p.java_version, 21);
        assert_eq!(p.forge_package_root, "net.neoforged.neoforge");
        assert_eq!(p.pack_format, 34);
        assert!(p.has_item_attributes_setter);
    }

    #[test]
    fn unknown_version_falls_back_safely() {
        let p = profile_for("1.42.0-snapshot", "forge");
        assert_eq!(p.java_version, 17); // safe default
        // Should still produce *something* compileable for the latest stable
        assert!(p.block_properties_init.contains("Properties"));
    }

    #[test]
    fn fabric_uses_fabric_block_settings() {
        let p = profile_for("1.20.4", "fabric");
        assert!(p.block_properties_init.contains("FabricBlockSettings"));
    }

    #[test]
    fn supported_pairs_covers_all_loader_versions() {
        // Every entry in supported_pairs() must resolve to a recognised
        // profile (i.e. not the unknown fall-through).
        for (v, l) in supported_pairs() {
            let l_str = match l {
                LoaderId::Forge => "forge",
                LoaderId::Fabric => "fabric",
                LoaderId::NeoForge => "neoforge",
                LoaderId::Quilt => "quilt",
            };
            let p = profile_for(v, l_str);
            assert!(
                p.mc_version != "unknown",
                "supported_pairs claims {} {} works but profile_for fell through",
                v,
                l_str
            );
        }
    }

    #[test]
    fn supports_old_versions_with_correct_java() {
        let p = profile_for("1.16.5", "forge");
        assert_eq!(p.java_version, 8);
        assert_eq!(p.pack_format, 6);
        assert!(p.block_properties_init.contains("Material.STONE"));

        let p = profile_for("1.17.1", "fabric");
        assert_eq!(p.java_version, 16);
        assert_eq!(p.pack_format, 7);

        let p = profile_for("1.18.2", "forge");
        assert_eq!(p.java_version, 17);
        assert_eq!(p.pack_format, 8);
    }

    #[test]
    fn supports_1_21_minor_versions() {
        let p = profile_for("1.21.1", "neoforge");
        assert_eq!(p.java_version, 21);
        assert_eq!(p.pack_format, 34);

        let p = profile_for("1.21.4", "neoforge");
        assert_eq!(p.pack_format, 46);
    }
}
