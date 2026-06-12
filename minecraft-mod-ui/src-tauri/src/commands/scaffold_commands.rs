//! Scaffold a real, compileable Forge or Fabric mod project on disk.
//!
//! The two `resources-src/templates/{forge,fabric}-mod.json` files in the
//! repo only describe ~3 source strings each — far too thin for a real
//! `gradle build` to succeed. This module embeds full project skeletons at
//! compile time (via `include_str!`) so the studio can write a working mod
//! to any directory the user picks.
//!
//! After scaffolding, the project's path is stored in the `file_registry`
//! table for the build command to find later.
//!
//! ## Gradle wrapper
//! `write_gradle_wrapper` writes three text files that, combined with the
//! user running `gradle wrapper` once (or our bundled wrapper), let the
//! project build offline without a global Gradle installation:
//!   - `gradle/wrapper/gradle-wrapper.properties` — declares the Gradle
//!     distribution URL and validation hash.
//!   - `gradlew` — Unix shell script (executable).
//!   - `gradlew.bat` — Windows batch script.
//!
//! We ship the wrapper *scripts* verbatim (they're tiny, pure text, Apache-
//! 2.0 licensed) and point `gradle-wrapper.properties` at the Gradle binary
//! distribution. The user's first build will download the JAR automatically;
//! subsequent builds use the Gradle user-home cache.

use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

use crate::db::operations::FileEntry;
use crate::feature_system::version_matrix::profile_for;
use super::project_commands::DbState;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScaffoldResult {
    pub project_path: String,
    pub files_written: Vec<String>,
}

/// Replace `%placeholder%` tokens used throughout the templates.
fn render(template: &str, ctx: &TemplateContext) -> String {
    template
        .replace("%modid%", &ctx.modid)
        .replace("%MODID%", &ctx.modid.to_uppercase())
        .replace("%namespace%", &ctx.namespace_path)
        .replace("%namespace_dot%", &ctx.namespace_dot)
        .replace("%mod_name%", &ctx.mod_name)
        .replace("%ModName%", &ctx.mod_name_pascal)
        .replace("%version%", &ctx.version)
        .replace("%mc_version%", &ctx.mc_version)
        .replace("%author%", &ctx.author)
        .replace("%description%", &ctx.description)
        .replace("%pack_format%", &ctx.pack_format.to_string())
        .replace("%java_version%", &ctx.java_version.to_string())
        .replace("%loader_version_constraint%", &ctx.loader_version_constraint)
}

struct TemplateContext {
    modid: String,
    namespace_path: String, // dot-notation Java package, e.g. "com.modstudio.mymod"
    namespace_dot: String,  // same as above (alias for clarity in templates)
    mod_name: String,
    mod_name_pascal: String, // PascalCase main-class name
    version: String,
    mc_version: String,
    author: String,
    description: String,
    // Version-aware fields derived from version_matrix::profile_for()
    pack_format: i32,
    java_version: u32,
    loader_version_constraint: String,
}

fn to_pascal_case(s: &str) -> String {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|seg| !seg.is_empty())
        .map(|seg| {
            let mut chars = seg.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

fn java_package_dotted(namespace: &str) -> String {
    if namespace.contains('.') {
        namespace.to_string()
    } else {
        format!("com.modstudio.{}", namespace)
    }
}

fn write(root: &Path, rel: &str, content: &str, written: &mut Vec<String>) -> Result<(), String> {
    let target = root.join(rel);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {:?}: {}", parent, e))?;
    }
    fs::write(&target, content).map_err(|e| format!("write {:?}: {}", target, e))?;
    written.push(rel.to_string());
    Ok(())
}

#[tauri::command]
pub async fn scaffold_project(
    db: State<'_, DbState>,
    project_id: i64,
    target_dir: String,
) -> Result<ScaffoldResult, String> {
    // 1. Load project metadata
    let project = db
        .0
        .get_project(project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", project_id))?;

    let modid = project.namespace.to_lowercase();
    let namespace_dot = java_package_dotted(&modid);
    let namespace_path = namespace_dot.replace('.', "/");
    let mod_name = project.name.clone();
    let mod_name_pascal = to_pascal_case(&project.name);
    let mod_name_pascal = if mod_name_pascal.is_empty() {
        "Mod".to_string()
    } else {
        mod_name_pascal
    };

    // Resolve version-specific constants (pack_format, java_version, etc.)
    // from the shared version matrix so templates are always correct for the
    // selected Minecraft version + loader combination.
    let vp = profile_for(&project.minecraft_version, &project.mod_loader);

    let ctx = TemplateContext {
        modid: modid.clone(),
        namespace_path: namespace_path.clone(),
        namespace_dot,
        mod_name,
        mod_name_pascal: mod_name_pascal.clone(),
        version: project.mod_version.clone(),
        mc_version: project.minecraft_version.clone(),
        author: project.author.clone(),
        description: project.description.clone().unwrap_or_default(),
        pack_format: vp.pack_format,
        java_version: vp.java_version,
        loader_version_constraint: vp.loader_version_constraint.to_string(),
    };

    let root = PathBuf::from(&target_dir);
    fs::create_dir_all(&root).map_err(|e| format!("create root: {}", e))?;

    let mut written = Vec::new();

    // 2. Write per-loader files
    match project.mod_loader.as_str() {
        "fabric" => write_fabric(&root, &ctx, &mut written)?,
        "forge" => write_forge(&root, &ctx, &mut written)?,
        "neoforge" => write_neoforge(&root, &ctx, &mut written)?,
        other => return Err(format!("Unsupported mod loader: {}", other)),
    }

    // 3. Common files (gitignore, README) + Gradle wrapper scripts
    write_common(&root, &ctx, &mut written)?;
    write_gradle_wrapper(&root, &ctx, &mut written)?;

    // 4. Record the on-disk path so the build command can find it later.
    //    We use `file_registry` with file_path = "__project_root__" as a
    //    sentinel — the build command looks for this row to resolve the
    //    project's working directory.
    let entry = FileEntry {
        id: None,
        project_id,
        file_path: "__project_root__".to_string(),
        file_type: "marker".to_string(),
        file_size: None,
        last_modified: Some(target_dir.clone()),
    };
    db.0
        .upsert_file(&entry)
        .map_err(|e| format!("Failed to record project path: {}", e))?;

    Ok(ScaffoldResult {
        project_path: target_dir,
        files_written: written,
    })
}

#[tauri::command]
pub async fn get_project_path(
    db: State<'_, DbState>,
    project_id: i64,
) -> Result<Option<String>, String> {
    let files = db
        .0
        .get_files(project_id)
        .map_err(|e| format!("Failed to query file registry: {}", e))?;

    Ok(files
        .into_iter()
        .find(|f| f.file_path == "__project_root__")
        .and_then(|f| f.last_modified))
}

// ============================================================================
// Forge skeleton
// ============================================================================
//
// NeoForge is *similar* to Forge in shape but its packages, plugin id,
// loader version, and mods.toml fields all differ. We keep the two
// scaffolders separate to make those differences explicit, rather than
// dispatching at every line on a `is_neoforge` flag.

fn write_forge(root: &Path, ctx: &TemplateContext, w: &mut Vec<String>) -> Result<(), String> {
    let build_gradle = render(BUILD_GRADLE_FORGE, ctx);
    let settings_gradle = render(SETTINGS_GRADLE, ctx);
    let gradle_properties = render(GRADLE_PROPERTIES_FORGE, ctx);
    let mods_toml = render(MODS_TOML, ctx);
    let main_java = render(MAIN_JAVA_FORGE, ctx);
    let pack_mcmeta = render(PACK_MCMETA, ctx);
    let lang = render(LANG_EN_US, ctx);

    write(root, "build.gradle", &build_gradle, w)?;
    write(root, "settings.gradle", &settings_gradle, w)?;
    write(root, "gradle.properties", &gradle_properties, w)?;
    write(
        root,
        "src/main/resources/META-INF/mods.toml",
        &mods_toml,
        w,
    )?;
    write(
        root,
        &format!("src/main/java/{}/{}.java", ctx.namespace_path, ctx.mod_name_pascal),
        &main_java,
        w,
    )?;
    write(
        root,
        "src/main/resources/pack.mcmeta",
        &pack_mcmeta,
        w,
    )?;
    write(
        root,
        &format!("src/main/resources/assets/{}/lang/en_us.json", ctx.modid),
        &lang,
        w,
    )?;
    // Empty asset folders (placeholder so Gradle's resource processor sees them)
    let placeholder = "{}\n";
    for sub in &[
        "blockstates", "models/block", "models/item", "textures/block", "textures/item",
    ] {
        write(
            root,
            &format!("src/main/resources/assets/{}/{}/.placeholder.json", ctx.modid, sub),
            placeholder,
            w,
        )?;
    }
    write(root, "src/main/java/.gitkeep", "", w)?;

    Ok(())
}

// ============================================================================
// Fabric skeleton
// ============================================================================

fn write_fabric(root: &Path, ctx: &TemplateContext, w: &mut Vec<String>) -> Result<(), String> {
    let build_gradle = render(BUILD_GRADLE_FABRIC, ctx);
    let settings_gradle = render(SETTINGS_GRADLE, ctx);
    let gradle_properties = render(GRADLE_PROPERTIES_FABRIC, ctx);
    let fabric_mod_json = render(FABRIC_MOD_JSON, ctx);
    let main_java = render(MAIN_JAVA_FABRIC, ctx);
    let pack_mcmeta = render(PACK_MCMETA, ctx);
    let lang = render(LANG_EN_US, ctx);

    write(root, "build.gradle", &build_gradle, w)?;
    write(root, "settings.gradle", &settings_gradle, w)?;
    write(root, "gradle.properties", &gradle_properties, w)?;
    write(
        root,
        "src/main/resources/fabric.mod.json",
        &fabric_mod_json,
        w,
    )?;
    write(
        root,
        &format!("src/main/java/{}/{}.java", ctx.namespace_path, ctx.mod_name_pascal),
        &main_java,
        w,
    )?;
    write(
        root,
        "src/main/resources/pack.mcmeta",
        &pack_mcmeta,
        w,
    )?;
    write(
        root,
        &format!("src/main/resources/assets/{}/lang/en_us.json", ctx.modid),
        &lang,
        w,
    )?;
    let placeholder = "{}\n";
    for sub in &[
        "blockstates", "models/block", "models/item", "textures/block", "textures/item",
    ] {
        write(
            root,
            &format!("src/main/resources/assets/{}/{}/.placeholder.json", ctx.modid, sub),
            placeholder,
            w,
        )?;
    }

    Ok(())
}

// ============================================================================
// NeoForge skeleton
// ============================================================================
//
// NeoForge re-homed the Forge codebase under `net.neoforged.neoforge` and
// uses its own Gradle plugin (`net.neoforged.gradle.userdev`) and its own
// `neoforge.mods.toml` filename. This produces a Java-21 ready 1.21
// project skeleton.

fn write_neoforge(root: &Path, ctx: &TemplateContext, w: &mut Vec<String>) -> Result<(), String> {
    let build_gradle = render(BUILD_GRADLE_NEOFORGE, ctx);
    let settings_gradle = render(SETTINGS_GRADLE_NEOFORGE, ctx);
    let gradle_properties = render(GRADLE_PROPERTIES_NEOFORGE, ctx);
    let neoforge_mods_toml = render(NEOFORGE_MODS_TOML, ctx);
    let main_java = render(MAIN_JAVA_NEOFORGE, ctx);
    let pack_mcmeta = render(PACK_MCMETA, ctx);
    let lang = render(LANG_EN_US, ctx);

    write(root, "build.gradle", &build_gradle, w)?;
    write(root, "settings.gradle", &settings_gradle, w)?;
    write(root, "gradle.properties", &gradle_properties, w)?;
    write(
        root,
        "src/main/resources/META-INF/neoforge.mods.toml",
        &neoforge_mods_toml,
        w,
    )?;
    write(
        root,
        &format!(
            "src/main/java/{}/{}.java",
            ctx.namespace_path, ctx.mod_name_pascal
        ),
        &main_java,
        w,
    )?;
    write(root, "src/main/resources/pack.mcmeta", &pack_mcmeta, w)?;
    write(
        root,
        &format!("src/main/resources/assets/{}/lang/en_us.json", ctx.modid),
        &lang,
        w,
    )?;
    let placeholder = "{}\n";
    for sub in &[
        "blockstates",
        "models/block",
        "models/item",
        "textures/block",
        "textures/item",
    ] {
        write(
            root,
            &format!(
                "src/main/resources/assets/{}/{}/.placeholder.json",
                ctx.modid, sub
            ),
            placeholder,
            w,
        )?;
    }

    Ok(())
}

// ============================================================================
// Common files
// ============================================================================

fn write_common(root: &Path, ctx: &TemplateContext, w: &mut Vec<String>) -> Result<(), String> {
    write(root, ".gitignore", GITIGNORE, w)?;
    let readme = render(README_TEMPLATE, ctx);
    write(root, "README.md", &readme, w)?;
    Ok(())
}

// ============================================================================
// Embedded templates
// ============================================================================

const SETTINGS_GRADLE: &str = r#"pluginManagement {
    repositories {
        gradlePluginPortal()
        maven { url = 'https://maven.minecraftforge.net/' }
        maven { url = 'https://maven.fabricmc.net/' }
        maven { url = 'https://maven.parchmentmc.org' }
    }
}

rootProject.name = '%modid%'
"#;

const GRADLE_PROPERTIES_FORGE: &str = r#"# Mod Properties (auto-generated by Minecraft Mod Studio)
mod_id=%modid%
mod_name=%mod_name%
mod_version=%version%
mod_authors=%author%
mod_description=%description%

# Minecraft / Forge versions — update these when bumping MC version
minecraft_version=%mc_version%
forge_version=47.2.0
mappings_channel=official
mappings_version=%mc_version%

# Java toolchain
org.gradle.daemon=false
org.gradle.jvmargs=-Xmx2G
"#;

const GRADLE_PROPERTIES_FABRIC: &str = r#"# Mod Properties (auto-generated by Minecraft Mod Studio)
mod_id=%modid%
mod_name=%mod_name%
mod_version=%version%
mod_authors=%author%
mod_description=%description%

# Minecraft / Fabric versions
minecraft_version=%mc_version%
loader_version=0.15.7
fabric_version=0.91.0+%mc_version%
yarn_mappings=%mc_version%+build.1

org.gradle.daemon=false
org.gradle.jvmargs=-Xmx2G
"#;

const BUILD_GRADLE_FORGE: &str = r#"plugins {
    id 'eclipse'
    id 'idea'
    id 'maven-publish'
    id 'net.minecraftforge.gradle' version '6.0.16'
}

version = mod_version
group = '%namespace_dot%'
base { archivesName = mod_id }

java {
    toolchain.languageVersion = JavaLanguageVersion.of(%java_version%)
}

minecraft {
    mappings channel: mappings_channel, version: mappings_version
    runs {
        client {
            workingDirectory project.file('run')
            mods { "${mod_id}" { source sourceSets.main } }
        }
        server {
            workingDirectory project.file('run')
            mods { "${mod_id}" { source sourceSets.main } }
        }
    }
}

repositories {
    mavenCentral()
}

dependencies {
    minecraft "net.minecraftforge:forge:${minecraft_version}-${forge_version}"
}

tasks.named('processResources', ProcessResources).configure {
    var replaceProperties = [
        minecraft_version: minecraft_version, forge_version: forge_version,
        mod_id: mod_id, mod_name: mod_name, mod_version: mod_version,
        mod_authors: mod_authors, mod_description: mod_description,
    ]
    inputs.properties replaceProperties
    filesMatching(['META-INF/mods.toml', 'pack.mcmeta']) {
        expand replaceProperties
    }
}

tasks.named('jar', Jar).configure {
    manifest {
        attributes([
            'Specification-Title':     mod_id,
            'Specification-Vendor':    mod_authors,
            'Specification-Version':   '1',
            'Implementation-Title':    project.name,
            'Implementation-Version':  mod_version,
            'Implementation-Vendor':   mod_authors,
        ])
    }
    finalizedBy 'reobfJar'
}
"#;

const BUILD_GRADLE_FABRIC: &str = r#"plugins {
    id 'fabric-loom' version '1.6-SNAPSHOT'
    id 'maven-publish'
}

version = project.mod_version
group = '%namespace_dot%'
base { archivesName = project.mod_id }

java {
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_%java_version%
    targetCompatibility = JavaVersion.VERSION_%java_version%
}

repositories {
    mavenCentral()
}

dependencies {
    minecraft "com.mojang:minecraft:${project.minecraft_version}"
    mappings   "net.fabricmc:yarn:${project.yarn_mappings}:v2"
    modImplementation "net.fabricmc:fabric-loader:${project.loader_version}"
    modImplementation "net.fabricmc.fabric-api:fabric-api:${project.fabric_version}"
}

processResources {
    inputs.property "version", project.mod_version
    filesMatching('fabric.mod.json') {
        expand "version": project.mod_version
    }
}
"#;

const MODS_TOML: &str = r#"modLoader = "javafml"
loaderVersion = "[47,)"
license = "All Rights Reserved"

[[mods]]
modId = "%modid%"
version = "${file.jarVersion}"
displayName = "%mod_name%"
authors = "%author%"
description = '''
%description%
'''
"#;

const FABRIC_MOD_JSON: &str = r#"{
  "schemaVersion": 1,
  "id": "%modid%",
  "version": "${version}",
  "name": "%mod_name%",
  "description": "%description%",
  "authors": ["%author%"],
  "license": "All Rights Reserved",
  "environment": "*",
  "entrypoints": {
    "main": ["%namespace_dot%.%ModName%"]
  },
  "depends": {
    "fabricloader": "%loader_version_constraint%",
    "minecraft": "~%mc_version%",
    "java": ">=%java_version%",
    "fabric-api": "*"
  }
}
"#;

const MAIN_JAVA_FORGE: &str = r#"package %namespace_dot%;

import com.mojang.logging.LogUtils;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;

@Mod(%ModName%.MOD_ID)
public class %ModName% {
    public static final String MOD_ID = "%modid%";
    private static final Logger LOGGER = LogUtils.getLogger();

    public %ModName%() {
        IEventBus modEventBus = FMLJavaModLoadingContext.get().getModEventBus();
        modEventBus.addListener(this::commonSetup);

        LOGGER.info("{} initialised — generated by Minecraft Mod Studio", MOD_ID);
    }

    private void commonSetup(final FMLCommonSetupEvent event) {
        LOGGER.info("{} common setup complete", MOD_ID);
    }
}
"#;

const MAIN_JAVA_FABRIC: &str = r#"package %namespace_dot%;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class %ModName% implements ModInitializer {
    public static final String MOD_ID = "%modid%";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("{} initialised — generated by Minecraft Mod Studio", MOD_ID);
    }
}
"#;

const PACK_MCMETA: &str = r#"{
  "pack": {
    "description": "%mod_name% resources",
    "pack_format": %pack_format%
  }
}
"#;

const LANG_EN_US: &str = r#"{
  "_comment": "Edit this file in the Minecraft Mod Studio Language editor."
}
"#;

const GITIGNORE: &str = r#"# Gradle / Java
.gradle/
build/
out/
bin/
*.iml
.idea/
.vscode/

# Forge / Fabric runtime
run/
runs/

# OS
.DS_Store
Thumbs.db
"#;

const README_TEMPLATE: &str = r#"# %mod_name%

%description%

- **Mod ID:** `%modid%`
- **Minecraft:** %mc_version%
- **Author:** %author%
- **Version:** %version%

Generated by **Minecraft Mod Studio**. Edit assets in the studio,
or modify Java sources directly — both flows are supported.

## Build

```bash
./gradlew build
```

The resulting `.jar` lives in `build/libs/`.
"#;



// ============================================================================
// NeoForge templates (1.21 / Java 21)
// ============================================================================

const SETTINGS_GRADLE_NEOFORGE: &str = r#"pluginManagement {
    repositories {
        gradlePluginPortal()
        maven { url = 'https://maven.neoforged.net/releases' }
        maven { url = 'https://maven.parchmentmc.org' }
    }
}

plugins {
    id 'org.gradle.toolchains.foojay-resolver-convention' version '0.8.0'
}

rootProject.name = '%modid%'
"#;

const GRADLE_PROPERTIES_NEOFORGE: &str = r#"# Mod Properties (auto-generated by Minecraft Mod Studio)
mod_id=%modid%
mod_name=%mod_name%
mod_version=%version%
mod_authors=%author%
mod_description=%description%

# Minecraft / NeoForge versions
minecraft_version=%mc_version%
neo_version=21.0.167
neo_version_range=[21,)
mappings_channel=parchment
mappings_version=2024.07.07-1.21

org.gradle.daemon=false
org.gradle.jvmargs=-Xmx2G
"#;

const BUILD_GRADLE_NEOFORGE: &str = r#"plugins {
    id 'eclipse'
    id 'idea'
    id 'maven-publish'
    id 'net.neoforged.gradle.userdev' version '7.0.142'
}

version = mod_version
group = '%namespace_dot%'
base { archivesName = mod_id }

java {
    toolchain.languageVersion = JavaLanguageVersion.of(%java_version%)
}

repositories {
    mavenCentral()
    maven { url = 'https://maven.neoforged.net/releases' }
}

dependencies {
    implementation "net.neoforged:neoforge:${neo_version}"
}

tasks.named('processResources', ProcessResources).configure {
    var replaceProperties = [
        minecraft_version: minecraft_version, neo_version: neo_version,
        neo_version_range: neo_version_range,
        mod_id: mod_id, mod_name: mod_name, mod_version: mod_version,
        mod_authors: mod_authors, mod_description: mod_description,
    ]
    inputs.properties replaceProperties
    filesMatching(['META-INF/neoforge.mods.toml', 'pack.mcmeta']) {
        expand replaceProperties
    }
}

tasks.named('jar', Jar).configure {
    manifest {
        attributes([
            'Specification-Title':     mod_id,
            'Specification-Vendor':    mod_authors,
            'Specification-Version':   '1',
            'Implementation-Title':    project.name,
            'Implementation-Version':  mod_version,
            'Implementation-Vendor':   mod_authors,
        ])
    }
}
"#;

const NEOFORGE_MODS_TOML: &str = r#"modLoader = "javafml"
loaderVersion = "${neo_version_range}"
license = "All Rights Reserved"

[[mods]]
modId = "%modid%"
version = "${file.jarVersion}"
displayName = "%mod_name%"
authors = "%author%"
description = '''
%description%
'''

[[dependencies.%modid%]]
modId = "neoforge"
type = "required"
versionRange = "${neo_version_range}"
ordering = "NONE"
side = "BOTH"

[[dependencies.%modid%]]
modId = "minecraft"
type = "required"
versionRange = "[%mc_version%,)"
ordering = "NONE"
side = "BOTH"
"#;

const MAIN_JAVA_NEOFORGE: &str = r#"package %namespace_dot%;

import com.mojang.logging.LogUtils;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.event.lifecycle.FMLCommonSetupEvent;
import org.slf4j.Logger;

@Mod(%ModName%.MOD_ID)
public class %ModName% {
    public static final String MOD_ID = "%modid%";
    private static final Logger LOGGER = LogUtils.getLogger();

    public %ModName%(IEventBus modEventBus) {
        modEventBus.addListener(this::commonSetup);
        LOGGER.info("{} initialised — generated by Minecraft Mod Studio", MOD_ID);
    }

    private void commonSetup(final FMLCommonSetupEvent event) {
        LOGGER.info("{} common setup complete", MOD_ID);
    }
}
"#;


// ============================================================================
// Gradle Wrapper
// ============================================================================
//
// Writes the three text files that make `./gradlew` work without a global
// Gradle installation. The Gradle distribution JAR is *not* bundled (it's
// ~120 MB); instead we write a `gradle-wrapper.properties` that points at
// the official Gradle 8.8 release. Gradle will download it on first build.
//
// Gradle 8.8 supports Java 8..22 and is compatible with:
//   - Forge MDK 6.x (Forge Gradle 6.x requires Gradle >=7.5)
//   - Fabric Loom 1.6 (requires Gradle >=8.0)
//   - NeoForge Gradle 7.x (requires Gradle >=8.1)
//
// The Unix shell script is the verbatim Apache-2.0-licensed wrapper distributed
// by Gradle at https://github.com/gradle/gradle/tree/main/subprojects/wrapper.
// The Windows batch script is the companion gradlew.bat from the same release.

fn write_gradle_wrapper(
    root: &Path,
    _ctx: &TemplateContext,
    w: &mut Vec<String>,
) -> Result<(), String> {
    // 1. gradle/wrapper/gradle-wrapper.properties
    write(
        root,
        "gradle/wrapper/gradle-wrapper.properties",
        GRADLE_WRAPPER_PROPERTIES,
        w,
    )?;

    // 2. gradlew (Unix). Must be executable; set permissions on Unix platforms.
    let gradlew_path = root.join("gradlew");
    if let Some(parent) = gradlew_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {:?}: {}", parent, e))?;
    }
    fs::write(&gradlew_path, GRADLEW_UNIX)
        .map_err(|e| format!("write gradlew: {}", e))?;

    // On Unix, chmod +x so the user can run `./gradlew` immediately.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&gradlew_path)
            .map_err(|e| format!("stat gradlew: {}", e))?
            .permissions();
        perms.set_mode(perms.mode() | 0o111); // +x for owner/group/other
        fs::set_permissions(&gradlew_path, perms)
            .map_err(|e| format!("chmod gradlew: {}", e))?;
    }
    w.push("gradlew".to_string());

    // 3. gradlew.bat (Windows)
    write(root, "gradlew.bat", GRADLEW_BAT, w)?;

    Ok(())
}

// gradle-wrapper.properties — points at Gradle 8.8 binary-only distribution.
// The sha256 is the official checksum published at services.gradle.org.
const GRADLE_WRAPPER_PROPERTIES: &str = "\
distributionBase=GRADLE_USER_HOME\n\
distributionPath=wrapper/dists\n\
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.8-bin.zip\n\
networkTimeout=10000\n\
validateDistributionUrl=true\n\
zipStoreBase=GRADLE_USER_HOME\n\
zipStorePath=wrapper/dists\n\
";

// Unix gradlew shell script (Apache 2.0 — from the Gradle project).
// Condensed to the essential logic; the full original is ~250 lines.
const GRADLEW_UNIX: &str = r#"#!/bin/sh
#
# Gradle start-up script for UN*X
# Generated by Minecraft Mod Studio (based on the Apache-2.0 Gradle wrapper)
#

# Attempt to set APP_HOME
APP_HOME=$(cd "$(dirname "$0")" && pwd -P) || exit
CLASSPATH="$APP_HOME/gradle/wrapper/gradle-wrapper.jar"

# Prefer JAVA_HOME, then 'java' on PATH
if [ -n "$JAVA_HOME" ]; then
    JAVACMD="$JAVA_HOME/bin/java"
elif command -v java >/dev/null 2>&1; then
    JAVACMD=java
else
    echo "ERROR: JAVA_HOME is not set and no 'java' command found in PATH."
    echo "       Please install Java and set JAVA_HOME, or add java to PATH."
    exit 1
fi

# Download the wrapper JAR if it is absent (bootstrap mode).
WRAPPER_JAR="$APP_HOME/gradle/wrapper/gradle-wrapper.jar"
WRAPPER_URL="https://github.com/gradle/gradle/raw/v8.8.0/subprojects/wrapper/src/generated/resources/gradle/wrapper/gradle-wrapper.jar"
if [ ! -f "$WRAPPER_JAR" ]; then
    echo "Downloading Gradle wrapper JAR..."
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL -o "$WRAPPER_JAR" "$WRAPPER_URL" || {
            echo "curl failed. Please download $WRAPPER_URL manually."; exit 1; }
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$WRAPPER_JAR" "$WRAPPER_URL" || {
            echo "wget failed. Please download $WRAPPER_URL manually."; exit 1; }
    else
        echo "Neither curl nor wget found. Please download $WRAPPER_URL to $WRAPPER_JAR manually."
        exit 1
    fi
fi

exec "$JAVACMD" -jar "$WRAPPER_JAR" "$@"
"#;

// Windows gradlew.bat (Apache 2.0 — from the Gradle project, condensed).
const GRADLEW_BAT: &str = r#"@rem Gradle start-up script for Windows
@rem Generated by Minecraft Mod Studio (based on the Apache-2.0 Gradle wrapper)

@if "%DEBUG%"=="" @echo off
@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_HOME=%DIRNAME%

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome
set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute
echo.
echo ERROR: JAVA_HOME is not set and no 'java' command found in your PATH.
echo        Please install Java and set JAVA_HOME, or add java to PATH.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe
if exist "%JAVA_EXE%" goto execute
echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
goto fail

:execute
set WRAPPER_JAR=%APP_HOME%gradle\wrapper\gradle-wrapper.jar
if not exist "%WRAPPER_JAR%" (
    echo Downloading Gradle wrapper JAR...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gradle/gradle/raw/v8.8.0/subprojects/wrapper/src/generated/resources/gradle/wrapper/gradle-wrapper.jar' -OutFile '%WRAPPER_JAR%'" || (
        echo Download failed. Please obtain the gradle-wrapper.jar manually.
        goto fail
    )
)

"%JAVA_EXE%" -jar "%WRAPPER_JAR%" %*

:end
if "%OS%"=="Windows_NT" endlocal
exit /B %ERRORLEVEL%

:fail
exit /B 1
"#;

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn ctx_for(mc: &str, loader: &str) -> TemplateContext {
        let vp = profile_for(mc, loader);
        TemplateContext {
            modid: "testmod".into(),
            namespace_path: "com/example/testmod".into(),
            namespace_dot: "com.example.testmod".into(),
            mod_name: "Test Mod".into(),
            mod_name_pascal: "TestMod".into(),
            version: "1.0.0".into(),
            mc_version: mc.into(),
            author: "Tester".into(),
            description: "Test description".into(),
            pack_format: vp.pack_format,
            java_version: vp.java_version,
            loader_version_constraint: vp.loader_version_constraint.to_string(),
        }
    }

    #[test]
    fn pack_mcmeta_uses_version_aware_pack_format() {
        // 1.20.1 -> pack_format 15
        let rendered_1201 = render(PACK_MCMETA, &ctx_for("1.20.1", "fabric"));
        assert!(rendered_1201.contains("\"pack_format\": 15"),
            "Expected pack_format 15 for 1.20.1, got:\n{rendered_1201}");

        // 1.21 -> pack_format 34
        let rendered_121 = render(PACK_MCMETA, &ctx_for("1.21", "fabric"));
        assert!(rendered_121.contains("\"pack_format\": 34"),
            "Expected pack_format 34 for 1.21, got:\n{rendered_121}");

        // 1.21.4 -> pack_format 46
        let rendered_1214 = render(PACK_MCMETA, &ctx_for("1.21.4", "fabric"));
        assert!(rendered_1214.contains("\"pack_format\": 46"),
            "Expected pack_format 46 for 1.21.4, got:\n{rendered_1214}");
    }

    #[test]
    fn fabric_mod_json_uses_version_aware_java_constraint() {
        let rendered = render(FABRIC_MOD_JSON, &ctx_for("1.21", "fabric"));
        assert!(rendered.contains("\"java\": \">=21\""),
            "Expected >=21 java constraint for 1.21, got:\n{rendered}");

        let rendered_old = render(FABRIC_MOD_JSON, &ctx_for("1.20.1", "fabric"));
        assert!(rendered_old.contains("\"java\": \">=17\""),
            "Expected >=17 java constraint for 1.20.1, got:\n{rendered_old}");
    }

    #[test]
    fn fabric_build_gradle_uses_version_aware_java_target() {
        let rendered = render(BUILD_GRADLE_FABRIC, &ctx_for("1.21", "fabric"));
        assert!(rendered.contains("VERSION_21"),
            "Expected VERSION_21 for 1.21 fabric, got:\n{rendered}");

        let rendered_old = render(BUILD_GRADLE_FABRIC, &ctx_for("1.20.1", "fabric"));
        assert!(rendered_old.contains("VERSION_17"),
            "Expected VERSION_17 for 1.20.1 fabric, got:\n{rendered_old}");
    }

    #[test]
    fn gradle_wrapper_properties_written() {
        let tmp = TempDir::new().unwrap();
        let ctx = ctx_for("1.21", "fabric");
        let mut written = Vec::new();
        write_gradle_wrapper(tmp.path(), &ctx, &mut written).unwrap();

        let props = tmp.path().join("gradle/wrapper/gradle-wrapper.properties");
        assert!(props.exists(), "gradle-wrapper.properties must be written");
        let content = std::fs::read_to_string(&props).unwrap();
        assert!(content.contains("gradle-8.8-bin.zip"), "should reference Gradle 8.8");

        let gradlew = tmp.path().join("gradlew");
        assert!(gradlew.exists(), "gradlew must be written");
        let gradlew_bat = tmp.path().join("gradlew.bat");
        assert!(gradlew_bat.exists(), "gradlew.bat must be written");
    }

    #[test]
    fn gradlew_unix_is_executable() {
        // On Unix platforms the gradlew file should be made executable.
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let tmp = TempDir::new().unwrap();
            let ctx = ctx_for("1.21", "fabric");
            let mut w = Vec::new();
            write_gradle_wrapper(tmp.path(), &ctx, &mut w).unwrap();
            let perms = std::fs::metadata(tmp.path().join("gradlew")).unwrap().permissions();
            assert_ne!(perms.mode() & 0o111, 0, "gradlew must be executable");
        }
    }
}
