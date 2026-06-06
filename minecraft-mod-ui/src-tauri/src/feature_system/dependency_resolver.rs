//! Dependency resolver — Maven coordinates and Gradle snippets for the
//! third-party libraries Minecraft mods routinely pull in.
//!
//! Today this module covers the most-asked-for set: Geckolib, JEI / REI /
//! EMI, Patchouli, Curios, Architectury. Each entry records:
//!
//!   * the loader(s) it supports
//!   * a per-MC-version `(group, artifact, version)` coordinate
//!   * the Maven repository to add (so the user does not have to remember
//!     "GeckoLib lives on cursemaven, not Maven Central")
//!   * a Gradle dependency line ready to paste into `build.gradle`
//!
//! Adding a new dependency is a single entry in `KNOWN_DEPS`. The
//! resolver returns one or more "snippets" that the user can append to
//! their build file; we explicitly do *not* mutate `build.gradle` in
//! place because users frequently customise it and a textual diff lets
//! them review before committing.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyInfo {
    pub id: String,           // e.g. "geckolib"
    pub display_name: String, // e.g. "GeckoLib"
    pub description: String,
    pub homepage: String,
    pub supported_loaders: Vec<String>,
    /// Per (mc_version, loader) -> coordinates. The keys are
    /// "<mc_version>:<loader>" for easy lookup.
    pub coordinates: Vec<DependencyCoordinate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyCoordinate {
    pub mc_version: String,
    pub loader: String,
    pub group: String,
    pub artifact: String,
    pub version: String,
    /// e.g. "https://maven.fabricmc.net/" or "https://cursemaven.com"
    pub maven_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedDependency {
    pub dependency: DependencyInfo,
    pub matched: Option<DependencyCoordinate>,
    pub gradle_snippet: String,
}

/// Look up a dependency by id and resolve it against (mc_version, loader).
pub fn resolve(id: &str, mc_version: &str, loader: &str) -> Option<ResolvedDependency> {
    let dep = known_deps().into_iter().find(|d| d.id == id)?;
    let matched = dep
        .coordinates
        .iter()
        .find(|c| {
            c.mc_version == mc_version
                && c.loader.eq_ignore_ascii_case(loader)
        })
        .cloned();

    let gradle_snippet = match &matched {
        Some(c) => render_gradle_snippet(&dep, c),
        None => format!(
            "// {} does not yet have a published build for ({}, {}).\n\
             // Check {} for the latest matrix.\n",
            dep.display_name, mc_version, loader, dep.homepage
        ),
    };

    Some(ResolvedDependency {
        dependency: dep,
        matched,
        gradle_snippet,
    })
}

pub fn list_known() -> Vec<DependencyInfo> {
    known_deps()
}

fn render_gradle_snippet(dep: &DependencyInfo, c: &DependencyCoordinate) -> String {
    // For Forge / NeoForge we use `implementation fg.deobf(...)`; Fabric
    // uses `modImplementation`. We pick by loader name.
    let dep_line = match c.loader.to_ascii_lowercase().as_str() {
        "fabric" | "quilt" => format!(
            "    modImplementation \"{}:{}:{}\"",
            c.group, c.artifact, c.version
        ),
        _ => format!(
            "    implementation fg.deobf(\"{}:{}:{}\")",
            c.group, c.artifact, c.version
        ),
    };

    let repo_line = if c.maven_url == "https://repo.maven.apache.org/maven2" {
        "// (Maven Central — already in repositories block)\n".to_string()
    } else {
        format!(
            "repositories {{\n    maven {{\n        name = \"{}\"\n        url = \"{}\"\n    }}\n}}\n\n",
            dep.display_name, c.maven_url
        )
    };

    format!(
        "// =========================================================================\n\
         //  {} dependency for {} ({})\n\
         //  {}\n\
         // =========================================================================\n\n\
         {}dependencies {{\n{}\n}}\n",
        dep.display_name, c.mc_version, c.loader, dep.homepage, repo_line, dep_line
    )
}

/// The known-deps catalog. Add new third-party mods by appending to this
/// list; nothing else needs to change.
fn known_deps() -> Vec<DependencyInfo> {
    vec![
        DependencyInfo {
            id: "geckolib".into(),
            display_name: "GeckoLib".into(),
            description: "Skeletal-mesh animation library used by many mob mods.".into(),
            homepage: "https://geckolib.com".into(),
            supported_loaders: vec!["forge".into(), "fabric".into(), "neoforge".into()],
            coordinates: vec![
                DependencyCoordinate {
                    mc_version: "1.20.1".into(),
                    loader: "forge".into(),
                    group: "software.bernie.geckolib".into(),
                    artifact: "geckolib-forge-1.20.1".into(),
                    version: "4.4.4".into(),
                    maven_url: "https://maven.cloudsmith.io/geckolib3/geckolib".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.20.4".into(),
                    loader: "forge".into(),
                    group: "software.bernie.geckolib".into(),
                    artifact: "geckolib-forge-1.20.4".into(),
                    version: "4.4.7".into(),
                    maven_url: "https://maven.cloudsmith.io/geckolib3/geckolib".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.21".into(),
                    loader: "neoforge".into(),
                    group: "software.bernie.geckolib".into(),
                    artifact: "geckolib-neoforge-1.21".into(),
                    version: "4.6.0".into(),
                    maven_url: "https://maven.cloudsmith.io/geckolib3/geckolib".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.20.4".into(),
                    loader: "fabric".into(),
                    group: "software.bernie.geckolib".into(),
                    artifact: "geckolib-fabric-1.20.4".into(),
                    version: "4.4.7".into(),
                    maven_url: "https://maven.cloudsmith.io/geckolib3/geckolib".into(),
                },
            ],
        },
        DependencyInfo {
            id: "jei".into(),
            display_name: "Just Enough Items (JEI)".into(),
            description: "Recipe-viewing UI library — required for custom recipe categories.".into(),
            homepage: "https://www.curseforge.com/minecraft/mc-mods/jei".into(),
            supported_loaders: vec!["forge".into(), "fabric".into(), "neoforge".into()],
            coordinates: vec![
                DependencyCoordinate {
                    mc_version: "1.20.1".into(),
                    loader: "forge".into(),
                    group: "mezz.jei".into(),
                    artifact: "jei-1.20.1-forge".into(),
                    version: "15.3.0.4".into(),
                    maven_url: "https://maven.blamejared.com".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.20.4".into(),
                    loader: "forge".into(),
                    group: "mezz.jei".into(),
                    artifact: "jei-1.20.4-forge".into(),
                    version: "17.3.0.49".into(),
                    maven_url: "https://maven.blamejared.com".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.21".into(),
                    loader: "neoforge".into(),
                    group: "mezz.jei".into(),
                    artifact: "jei-1.21-neoforge".into(),
                    version: "19.10.0.0".into(),
                    maven_url: "https://maven.blamejared.com".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.20.4".into(),
                    loader: "fabric".into(),
                    group: "mezz.jei".into(),
                    artifact: "jei-1.20.4-fabric".into(),
                    version: "17.3.0.49".into(),
                    maven_url: "https://maven.blamejared.com".into(),
                },
            ],
        },
        DependencyInfo {
            id: "rei".into(),
            display_name: "Roughly Enough Items (REI)".into(),
            description: "JEI alternative used widely on Fabric.".into(),
            homepage: "https://www.curseforge.com/minecraft/mc-mods/roughly-enough-items".into(),
            supported_loaders: vec!["fabric".into(), "forge".into()],
            coordinates: vec![DependencyCoordinate {
                mc_version: "1.20.4".into(),
                loader: "fabric".into(),
                group: "me.shedaniel".into(),
                artifact: "RoughlyEnoughItems-fabric".into(),
                version: "14.0.726".into(),
                maven_url: "https://maven.shedaniel.me".into(),
            }],
        },
        DependencyInfo {
            id: "patchouli".into(),
            display_name: "Patchouli".into(),
            description: "JSON-driven in-game guidebooks.".into(),
            homepage: "https://github.com/VazkiiMods/Patchouli".into(),
            supported_loaders: vec!["forge".into(), "fabric".into(), "neoforge".into()],
            coordinates: vec![
                DependencyCoordinate {
                    mc_version: "1.20.1".into(),
                    loader: "forge".into(),
                    group: "vazkii.patchouli".into(),
                    artifact: "Patchouli".into(),
                    version: "1.20.1-84-FORGE".into(),
                    maven_url: "https://maven.blamejared.com".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.20.4".into(),
                    loader: "fabric".into(),
                    group: "vazkii.patchouli".into(),
                    artifact: "Patchouli".into(),
                    version: "1.20.4-86-FABRIC".into(),
                    maven_url: "https://maven.blamejared.com".into(),
                },
            ],
        },
        DependencyInfo {
            id: "curios".into(),
            display_name: "Curios API".into(),
            description: "Adds a slot-based accessory inventory (rings, belts, etc.).".into(),
            homepage: "https://github.com/TheIllusiveC4/Curios".into(),
            supported_loaders: vec!["forge".into(), "neoforge".into()],
            coordinates: vec![
                DependencyCoordinate {
                    mc_version: "1.20.1".into(),
                    loader: "forge".into(),
                    group: "top.theillusivec4.curios".into(),
                    artifact: "curios-forge".into(),
                    version: "5.7.0+1.20.1".into(),
                    maven_url: "https://maven.theillusivec4.top".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.21".into(),
                    loader: "neoforge".into(),
                    group: "top.theillusivec4.curios".into(),
                    artifact: "curios-neoforge".into(),
                    version: "9.0.0+1.21".into(),
                    maven_url: "https://maven.theillusivec4.top".into(),
                },
            ],
        },
        DependencyInfo {
            id: "architectury".into(),
            display_name: "Architectury API".into(),
            description: "Cross-loader API for writing one mod that works on Forge + Fabric + NeoForge.".into(),
            homepage: "https://docs.architectury.dev".into(),
            supported_loaders: vec!["forge".into(), "fabric".into(), "neoforge".into()],
            coordinates: vec![
                DependencyCoordinate {
                    mc_version: "1.20.1".into(),
                    loader: "forge".into(),
                    group: "dev.architectury".into(),
                    artifact: "architectury-forge".into(),
                    version: "9.2.14".into(),
                    maven_url: "https://maven.architectury.dev".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.20.4".into(),
                    loader: "fabric".into(),
                    group: "dev.architectury".into(),
                    artifact: "architectury-fabric".into(),
                    version: "11.0.10".into(),
                    maven_url: "https://maven.architectury.dev".into(),
                },
                DependencyCoordinate {
                    mc_version: "1.21".into(),
                    loader: "neoforge".into(),
                    group: "dev.architectury".into(),
                    artifact: "architectury-neoforge".into(),
                    version: "13.0.6".into(),
                    maven_url: "https://maven.architectury.dev".into(),
                },
            ],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_deps_have_unique_ids() {
        let deps = known_deps();
        let mut ids: Vec<_> = deps.iter().map(|d| d.id.clone()).collect();
        ids.sort();
        let original = ids.clone();
        ids.dedup();
        assert_eq!(ids, original, "duplicate dependency ids in known_deps()");
    }

    #[test]
    fn resolve_finds_geckolib_for_neoforge_1_21() {
        let r = resolve("geckolib", "1.21", "neoforge").expect("must resolve");
        let m = r.matched.expect("must match a coordinate");
        assert_eq!(m.loader, "neoforge");
        assert!(r.gradle_snippet.contains("geckolib-neoforge"));
        assert!(r.gradle_snippet.contains("implementation"));
    }

    #[test]
    fn resolve_uses_modimplementation_for_fabric() {
        let r = resolve("jei", "1.20.4", "fabric").unwrap();
        assert!(r.gradle_snippet.contains("modImplementation"));
    }

    #[test]
    fn resolve_returns_helpful_message_for_unsupported_combo() {
        // Curios has no Fabric coordinates today.
        let r = resolve("curios", "1.20.4", "fabric").unwrap();
        assert!(r.matched.is_none());
        assert!(r.gradle_snippet.contains("does not yet have"));
    }

    #[test]
    fn unknown_dependency_returns_none() {
        assert!(resolve("does-not-exist", "1.20.4", "forge").is_none());
    }
}
