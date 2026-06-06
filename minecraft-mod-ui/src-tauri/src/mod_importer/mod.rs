//! Mod & Modpack Importer.
//!
//! Reads a `.jar` (mod) or `.zip` (modpack / resource pack) and extracts
//! a structured **inventory** of what is inside without permanently
//! unpacking the archive. The frontend can then render the inventory in
//! the new "Open Mod" panel and let the user browse / search the contents
//! before deciding to extract anything.
//!
//! What we extract today
//! ---------------------
//! For a mod `.jar`:
//!   * Loader detection: `META-INF/mods.toml` (Forge), `META-INF/neoforge.mods.toml`
//!     (NeoForge), `fabric.mod.json` (Fabric), `quilt.mod.json` (Quilt).
//!   * Mod metadata: id, name, version, authors, description, license,
//!     supported MC version range, dependency list.
//!   * Asset inventory: counts and lists for blockstates / models /
//!     textures / lang / sounds / recipes / loot tables / advancements /
//!     tags / dimensions / biomes / structures.
//!   * Java class inventory: full list of `*.class` files (we do not
//!     decompile — listing is enough to surface "this mod has 14
//!     classes under com.foo.bar.entity").
//!
//! For a modpack `.zip` we additionally:
//!   * detect `manifest.json` (CurseForge) or `modrinth.index.json`
//!     (Modrinth) and surface the list of bundled mods + Minecraft /
//!     loader version constraints.
//!
//! The output type is JSON-friendly so the React side can show the
//! inventory in a tree view with capability badges (Block / Item /
//! Recipe / etc.) per mod.
//!
//! Importantly, the parser never panics on malformed archives — every
//! step is fallible and returns a soft warning instead of stopping
//! the whole import. Real-world mod jars routinely have weird quirks.

use std::collections::BTreeMap;
use std::io::{BufReader, Read};
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ImportedMod {
    pub mod_id: String,
    pub display_name: String,
    pub version: String,
    pub description: String,
    pub authors: Vec<String>,
    pub license: String,
    pub homepage: String,

    /// `forge` / `fabric` / `neoforge` / `quilt` / `unknown`.
    pub loader: String,
    /// e.g. `[1.20,1.21)`.
    pub minecraft_version_range: String,

    pub dependencies: Vec<ModDependency>,

    /// One entry per recognised feature kind. Counts are zero when
    /// absent so the UI can render "0 recipes" without branching.
    pub feature_counts: FeatureCounts,

    /// File listings for the most-asked-for kinds. Capped at 200
    /// entries per kind to keep payloads small; the UI shows
    /// "+N more" if the cap is hit.
    pub feature_files: FeatureFiles,

    /// Java packages observed in `*.class` paths, with class count.
    pub java_packages: BTreeMap<String, u32>,

    /// Total counts for the user's situational awareness.
    pub total_classes: u32,
    pub total_assets: u32,
    pub total_data_files: u32,
    pub raw_size_bytes: u64,

    /// Non-fatal parser warnings (malformed json, unexpected paths…).
    pub warnings: Vec<String>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ModDependency {
    pub mod_id: String,
    pub version_range: String,
    pub mandatory: bool,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct FeatureCounts {
    pub blocks: u32,
    pub items: u32,
    pub blockstates: u32,
    pub models_block: u32,
    pub models_item: u32,
    pub textures_block: u32,
    pub textures_item: u32,
    pub textures_entity: u32,
    pub recipes: u32,
    pub loot_tables: u32,
    pub advancements: u32,
    pub structures: u32,
    pub biomes: u32,
    pub dimensions: u32,
    pub worldgen_features: u32,
    pub tags: u32,
    pub lang_files: u32,
    pub sounds: u32,
    pub mixins: u32,
    pub jei_plugins: u32,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct FeatureFiles {
    pub blockstates: Vec<String>,
    pub models_block: Vec<String>,
    pub models_item: Vec<String>,
    pub textures_block: Vec<String>,
    pub textures_item: Vec<String>,
    pub recipes: Vec<String>,
    pub loot_tables: Vec<String>,
    pub advancements: Vec<String>,
    pub lang_files: Vec<String>,
    pub other: Vec<String>,
}

const PER_KIND_CAP: usize = 200;

/// Top-level entry: dispatch on extension.
pub fn import_archive(path: &Path) -> Result<ImportArchiveResult, String> {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();

    let bytes = std::fs::metadata(path)
        .map(|m| m.len())
        .unwrap_or(0);

    let file = std::fs::File::open(path).map_err(|e| format!("open {:?}: {}", path, e))?;
    let mut zip_archive = zip::ZipArchive::new(BufReader::new(file))
        .map_err(|e| format!("not a valid zip/jar: {}", e))?;

    if matches!(ext.as_str(), "jar") {
        let mut m = parse_mod_jar(&mut zip_archive)?;
        m.raw_size_bytes = bytes;
        return Ok(ImportArchiveResult::Mod(Box::new(m)));
    }

    // .zip — try modpack manifests first, fall back to "loose archive".
    if let Some(pack) = try_parse_modpack(&mut zip_archive)? {
        return Ok(ImportArchiveResult::Modpack(Box::new(pack)));
    }

    // Plain zip with a single mod inside? Some users pack a mod inside a
    // zip for distribution. Look for the first .jar and recurse.
    let mut inner_jar_name: Option<String> = None;
    for i in 0..zip_archive.len() {
        if let Ok(entry) = zip_archive.by_index(i) {
            let name = entry.name().to_string();
            if name.to_ascii_lowercase().ends_with(".jar") {
                inner_jar_name = Some(name);
                break;
            }
        }
    }
    if let Some(name) = inner_jar_name {
        // Extract that single jar to memory and re-parse.
        let mut buf = Vec::new();
        zip_archive
            .by_name(&name)
            .map_err(|e| format!("read inner jar {}: {}", name, e))?
            .read_to_end(&mut buf)
            .map_err(|e| format!("read inner jar bytes: {}", e))?;
        let cursor = std::io::Cursor::new(buf);
        let mut inner = zip::ZipArchive::new(cursor)
            .map_err(|e| format!("inner jar invalid: {}", e))?;
        let mut m = parse_mod_jar(&mut inner)?;
        m.raw_size_bytes = bytes;
        m.warnings
            .insert(0, format!("Imported from inner jar: {}", name));
        return Ok(ImportArchiveResult::Mod(Box::new(m)));
    }

    Err(format!(
        "Unrecognised archive type ({}). Expected .jar (mod) or .zip (modpack).",
        ext
    ))
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ImportArchiveResult {
    Mod(Box<ImportedMod>),
    Modpack(Box<ImportedModpack>),
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ImportedModpack {
    pub format: String, // curseforge / modrinth
    pub name: String,
    pub version: String,
    pub author: String,
    pub minecraft_version: String,
    pub loader: String,
    pub mod_count: u32,
    pub mods: Vec<ModpackEntry>,
    pub override_files: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ModpackEntry {
    pub project_id: String,
    pub file_id: String,
    pub name: String,
    pub required: bool,
    pub source: String, // "curseforge" / "modrinth" / "url"
}

// ============================================================================
// JAR parsing
// ============================================================================

fn parse_mod_jar<R: Read + std::io::Seek>(
    archive: &mut zip::ZipArchive<R>,
) -> Result<ImportedMod, String> {
    let mut m = ImportedMod::default();

    // Walk every entry once, classifying as we go.
    for i in 0..archive.len() {
        let mut entry = match archive.by_index(i) {
            Ok(e) => e,
            Err(e) => {
                m.warnings
                    .push(format!("Skipping malformed entry at {}: {}", i, e));
                continue;
            }
        };
        if entry.is_dir() {
            continue;
        }
        let name = entry.name().to_string();

        // Metadata files first (read body when needed).
        match name.as_str() {
            "META-INF/mods.toml" => {
                let mut buf = String::new();
                if entry.read_to_string(&mut buf).is_ok() {
                    parse_mods_toml(&buf, &mut m, "forge");
                }
                continue;
            }
            "META-INF/neoforge.mods.toml" => {
                let mut buf = String::new();
                if entry.read_to_string(&mut buf).is_ok() {
                    parse_mods_toml(&buf, &mut m, "neoforge");
                }
                continue;
            }
            "fabric.mod.json" => {
                let mut buf = String::new();
                if entry.read_to_string(&mut buf).is_ok() {
                    parse_fabric_mod_json(&buf, &mut m);
                }
                continue;
            }
            "quilt.mod.json" => {
                let mut buf = String::new();
                if entry.read_to_string(&mut buf).is_ok() {
                    parse_quilt_mod_json(&buf, &mut m);
                }
                continue;
            }
            _ => {}
        }

        // Asset / data classification by path shape.
        classify_path(&name, &mut m);
    }

    if m.loader.is_empty() {
        m.loader = "unknown".into();
        m.warnings
            .push("No loader manifest detected (mods.toml / fabric.mod.json).".into());
    }
    if m.mod_id.is_empty() {
        m.mod_id = "unknown".into();
    }
    if m.display_name.is_empty() {
        m.display_name = m.mod_id.clone();
    }

    Ok(m)
}

fn parse_mods_toml(content: &str, m: &mut ImportedMod, loader: &str) {
    m.loader = loader.into();

    // Extremely small TOML reader — we look for the keys we care about.
    // Pulling a full TOML crate just for this would cost more than it
    // gives us, since mods.toml is well-shaped.
    fn extract<'a>(haystack: &'a str, key: &str) -> Option<&'a str> {
        for line in haystack.lines() {
            let line = line.trim();
            if let Some(rest) = line.strip_prefix(&format!("{}=", key)).or_else(|| {
                line.strip_prefix(&format!("{} =", key))
                    .map(|s| s.trim_start())
            }) {
                let rest = rest.trim();
                let rest = rest.trim_start_matches('"').trim_end_matches('"');
                let rest = rest.trim_start_matches('\'').trim_end_matches('\'');
                if !rest.is_empty() {
                    return Some(rest);
                }
            }
        }
        None
    }

    if let Some(v) = extract(content, "modId") {
        m.mod_id = v.to_string();
    }
    if let Some(v) = extract(content, "displayName") {
        m.display_name = v.to_string();
    }
    if let Some(v) = extract(content, "version") {
        m.version = v.to_string();
    }
    if let Some(v) = extract(content, "authors") {
        m.authors = v.split(',').map(|s| s.trim().to_string()).collect();
    }
    if let Some(v) = extract(content, "description") {
        m.description = v.to_string();
    }
    if let Some(v) = extract(content, "license") {
        m.license = v.to_string();
    }
    if let Some(v) = extract(content, "displayURL").or_else(|| extract(content, "homepage")) {
        m.homepage = v.to_string();
    }

    // Dependency blocks ([[dependencies.<modid>]]). We only count and
    // extract modId + versionRange + mandatory.
    let mut current: Option<ModDependency> = None;
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("[[dependencies.") {
            if let Some(d) = current.take() {
                m.dependencies.push(d);
            }
            current = Some(ModDependency::default());
        } else if let Some(d) = current.as_mut() {
            if let Some(v) = line.strip_prefix("modId=").or_else(|| line.strip_prefix("modId =")) {
                d.mod_id = v.trim().trim_matches('"').to_string();
            } else if let Some(v) = line
                .strip_prefix("versionRange=")
                .or_else(|| line.strip_prefix("versionRange ="))
            {
                d.version_range = v.trim().trim_matches('"').to_string();
            } else if let Some(v) = line
                .strip_prefix("mandatory=")
                .or_else(|| line.strip_prefix("mandatory ="))
            {
                d.mandatory = matches!(v.trim(), "true" | "True" | "TRUE");
            }
        }
        if line.starts_with("[[mods]]") || line.starts_with("[mods]") {
            if let Some(d) = current.take() {
                m.dependencies.push(d);
            }
        }
    }
    if let Some(d) = current {
        if !d.mod_id.is_empty() {
            m.dependencies.push(d);
        }
    }

    // Look for "minecraft" dep to surface as the MC version constraint.
    if let Some(mc) = m.dependencies.iter().find(|d| d.mod_id == "minecraft") {
        m.minecraft_version_range = mc.version_range.clone();
    }
}

fn parse_fabric_mod_json(content: &str, m: &mut ImportedMod) {
    m.loader = "fabric".into();
    let v: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(e) => {
            m.warnings
                .push(format!("Could not parse fabric.mod.json: {}", e));
            return;
        }
    };

    if let Some(s) = v.get("id").and_then(|x| x.as_str()) {
        m.mod_id = s.to_string();
    }
    if let Some(s) = v.get("name").and_then(|x| x.as_str()) {
        m.display_name = s.to_string();
    }
    if let Some(s) = v.get("version").and_then(|x| x.as_str()) {
        m.version = s.to_string();
    }
    if let Some(s) = v.get("description").and_then(|x| x.as_str()) {
        m.description = s.to_string();
    }
    if let Some(s) = v.get("license").and_then(|x| x.as_str()) {
        m.license = s.to_string();
    }
    if let Some(c) = v.get("contact") {
        if let Some(h) = c.get("homepage").and_then(|x| x.as_str()) {
            m.homepage = h.to_string();
        }
    }
    if let Some(arr) = v.get("authors").and_then(|x| x.as_array()) {
        m.authors = arr
            .iter()
            .filter_map(|a| {
                a.as_str().map(String::from).or_else(|| {
                    a.get("name")
                        .and_then(|n| n.as_str())
                        .map(String::from)
                })
            })
            .collect();
    }
    if let Some(deps) = v.get("depends").and_then(|x| x.as_object()) {
        for (k, val) in deps {
            let range = val.as_str().unwrap_or("").to_string();
            if k == "minecraft" {
                m.minecraft_version_range = range.clone();
            }
            m.dependencies.push(ModDependency {
                mod_id: k.clone(),
                version_range: range,
                mandatory: true,
            });
        }
    }
}

fn parse_quilt_mod_json(content: &str, m: &mut ImportedMod) {
    m.loader = "quilt".into();
    let v: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(_) => return,
    };
    let qm = v.get("quilt_loader").unwrap_or(&v);
    if let Some(s) = qm.get("id").and_then(|x| x.as_str()) {
        m.mod_id = s.to_string();
    }
    if let Some(s) = qm.get("version").and_then(|x| x.as_str()) {
        m.version = s.to_string();
    }
    if let Some(meta) = qm.get("metadata") {
        if let Some(s) = meta.get("name").and_then(|x| x.as_str()) {
            m.display_name = s.to_string();
        }
        if let Some(s) = meta.get("description").and_then(|x| x.as_str()) {
            m.description = s.to_string();
        }
    }
}

fn classify_path(name: &str, m: &mut ImportedMod) {
    if name.ends_with(".class") {
        m.total_classes += 1;
        if let Some(pkg) = name
            .strip_suffix(".class")
            .and_then(|s| s.rsplit_once('/'))
            .map(|(p, _)| p.replace('/', "."))
        {
            *m.java_packages.entry(pkg).or_insert(0) += 1;
        }
        return;
    }

    let segments: Vec<&str> = name.split('/').collect();
    // Most asset / data paths follow:
    //   assets/<modid>/<kind>/...
    //   data/<modid>/<kind>/...
    if segments.len() >= 4 && (segments[0] == "assets" || segments[0] == "data") {
        let kind = segments[2];
        let area = segments[0];

        match (area, kind) {
            ("assets", "blockstates") => {
                m.feature_counts.blockstates += 1;
                push_capped(&mut m.feature_files.blockstates, name);
                m.total_assets += 1;
            }
            ("assets", "models") if segments.len() >= 5 && segments[3] == "block" => {
                m.feature_counts.models_block += 1;
                push_capped(&mut m.feature_files.models_block, name);
                m.total_assets += 1;
            }
            ("assets", "models") if segments.len() >= 5 && segments[3] == "item" => {
                m.feature_counts.models_item += 1;
                push_capped(&mut m.feature_files.models_item, name);
                m.total_assets += 1;
            }
            ("assets", "textures") if segments.len() >= 5 && segments[3] == "block" => {
                m.feature_counts.textures_block += 1;
                push_capped(&mut m.feature_files.textures_block, name);
                m.total_assets += 1;
            }
            ("assets", "textures") if segments.len() >= 5 && segments[3] == "item" => {
                m.feature_counts.textures_item += 1;
                push_capped(&mut m.feature_files.textures_item, name);
                m.total_assets += 1;
            }
            ("assets", "textures") if segments.len() >= 5 && segments[3] == "entity" => {
                m.feature_counts.textures_entity += 1;
                m.total_assets += 1;
            }
            ("assets", "lang") => {
                m.feature_counts.lang_files += 1;
                push_capped(&mut m.feature_files.lang_files, name);
                m.total_assets += 1;
            }
            ("assets", "sounds.json") | ("assets", "sounds") => {
                m.feature_counts.sounds += 1;
                m.total_assets += 1;
            }
            ("data", "recipe") | ("data", "recipes") => {
                m.feature_counts.recipes += 1;
                push_capped(&mut m.feature_files.recipes, name);
                m.total_data_files += 1;
            }
            ("data", "loot_table") | ("data", "loot_tables") => {
                m.feature_counts.loot_tables += 1;
                push_capped(&mut m.feature_files.loot_tables, name);
                m.total_data_files += 1;
            }
            ("data", "advancement") | ("data", "advancements") => {
                m.feature_counts.advancements += 1;
                push_capped(&mut m.feature_files.advancements, name);
                m.total_data_files += 1;
            }
            ("data", "tags") => {
                m.feature_counts.tags += 1;
                m.total_data_files += 1;
            }
            ("data", "dimension") => {
                m.feature_counts.dimensions += 1;
                m.total_data_files += 1;
            }
            ("data", "worldgen") if segments.len() >= 5 && segments[3] == "biome" => {
                m.feature_counts.biomes += 1;
                m.total_data_files += 1;
            }
            ("data", "worldgen")
                if segments.len() >= 5
                    && (segments[3] == "configured_feature"
                        || segments[3] == "placed_feature") =>
            {
                m.feature_counts.worldgen_features += 1;
                m.total_data_files += 1;
            }
            ("data", "worldgen") if segments.len() >= 5 && segments[3] == "structure" => {
                m.feature_counts.structures += 1;
                m.total_data_files += 1;
            }
            _ => {
                // Unknown kind under assets/ or data/ — count as data file.
                m.total_data_files += 1;
                push_capped(&mut m.feature_files.other, name);
            }
        }
        return;
    }

    // Mixin manifests show up at the top of the jar.
    if name.contains("mixins") && name.ends_with(".json") {
        m.feature_counts.mixins += 1;
        return;
    }

    // JEI plugin marker (Forge)
    if name == "META-INF/services/mezz.jei.api.IModPlugin" {
        m.feature_counts.jei_plugins += 1;
    }
}

fn push_capped(v: &mut Vec<String>, item: &str) {
    if v.len() < PER_KIND_CAP {
        v.push(item.to_string());
    }
}

// ============================================================================
// Modpack parsing
// ============================================================================

fn try_parse_modpack<R: Read + std::io::Seek>(
    archive: &mut zip::ZipArchive<R>,
) -> Result<Option<ImportedModpack>, String> {
    // CurseForge: manifest.json
    if archive.by_name("manifest.json").is_ok() {
        let mut buf = String::new();
        archive
            .by_name("manifest.json")
            .map_err(|e| format!("manifest.json: {}", e))?
            .read_to_string(&mut buf)
            .map_err(|e| format!("read manifest.json: {}", e))?;
        return Ok(Some(parse_curseforge_manifest(&buf)));
    }
    // Modrinth: modrinth.index.json
    if archive.by_name("modrinth.index.json").is_ok() {
        let mut buf = String::new();
        archive
            .by_name("modrinth.index.json")
            .map_err(|e| format!("modrinth.index.json: {}", e))?
            .read_to_string(&mut buf)
            .map_err(|e| format!("read modrinth.index.json: {}", e))?;
        return Ok(Some(parse_modrinth_index(&buf)));
    }
    Ok(None)
}

fn parse_curseforge_manifest(content: &str) -> ImportedModpack {
    let mut p = ImportedModpack {
        format: "curseforge".into(),
        ..Default::default()
    };
    let v: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(e) => {
            p.warnings.push(format!("manifest.json parse error: {}", e));
            return p;
        }
    };
    if let Some(s) = v.get("name").and_then(|x| x.as_str()) {
        p.name = s.into();
    }
    if let Some(s) = v.get("version").and_then(|x| x.as_str()) {
        p.version = s.into();
    }
    if let Some(s) = v.get("author").and_then(|x| x.as_str()) {
        p.author = s.into();
    }
    if let Some(mc) = v.get("minecraft") {
        if let Some(s) = mc.get("version").and_then(|x| x.as_str()) {
            p.minecraft_version = s.into();
        }
        if let Some(arr) = mc.get("modLoaders").and_then(|x| x.as_array()) {
            for ml in arr {
                if let Some(s) = ml.get("id").and_then(|x| x.as_str()) {
                    let lower = s.to_ascii_lowercase();
                    if lower.starts_with("forge") {
                        p.loader = "forge".into();
                    } else if lower.starts_with("fabric") {
                        p.loader = "fabric".into();
                    } else if lower.starts_with("neoforge") {
                        p.loader = "neoforge".into();
                    } else if lower.starts_with("quilt") {
                        p.loader = "quilt".into();
                    }
                }
            }
        }
    }
    if let Some(arr) = v.get("files").and_then(|x| x.as_array()) {
        for f in arr {
            let mut e = ModpackEntry {
                source: "curseforge".into(),
                ..Default::default()
            };
            if let Some(n) = f.get("projectID").map(|x| x.to_string()) {
                e.project_id = n;
            }
            if let Some(n) = f.get("fileID").map(|x| x.to_string()) {
                e.file_id = n;
            }
            if let Some(b) = f.get("required").and_then(|x| x.as_bool()) {
                e.required = b;
            }
            p.mods.push(e);
        }
    }
    p.mod_count = p.mods.len() as u32;
    p
}

fn parse_modrinth_index(content: &str) -> ImportedModpack {
    let mut p = ImportedModpack {
        format: "modrinth".into(),
        ..Default::default()
    };
    let v: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(e) => {
            p.warnings.push(format!("modrinth.index.json: {}", e));
            return p;
        }
    };
    if let Some(s) = v.get("name").and_then(|x| x.as_str()) {
        p.name = s.into();
    }
    if let Some(s) = v.get("versionId").and_then(|x| x.as_str()) {
        p.version = s.into();
    }
    if let Some(deps) = v.get("dependencies").and_then(|x| x.as_object()) {
        if let Some(s) = deps.get("minecraft").and_then(|x| x.as_str()) {
            p.minecraft_version = s.into();
        }
        if deps.contains_key("forge") {
            p.loader = "forge".into();
        } else if deps.contains_key("fabric-loader") {
            p.loader = "fabric".into();
        } else if deps.contains_key("neoforge") {
            p.loader = "neoforge".into();
        } else if deps.contains_key("quilt-loader") {
            p.loader = "quilt".into();
        }
    }
    if let Some(files) = v.get("files").and_then(|x| x.as_array()) {
        for f in files {
            let mut e = ModpackEntry {
                source: "modrinth".into(),
                ..Default::default()
            };
            if let Some(s) = f.get("path").and_then(|x| x.as_str()) {
                e.name = s.into();
            }
            if let Some(env) = f.get("env") {
                if let Some(req) = env.get("client").and_then(|x| x.as_str()) {
                    e.required = req == "required";
                }
            }
            p.mods.push(e);
        }
    }
    p.mod_count = p.mods.len() as u32;
    p
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, Write};
    use zip::write::SimpleFileOptions;

    fn write_jar(entries: &[(&str, &str)]) -> Vec<u8> {
        let mut buf = Vec::new();
        {
            let mut w = zip::ZipWriter::new(Cursor::new(&mut buf));
            for (name, content) in entries {
                w.start_file::<_, ()>(*name, SimpleFileOptions::default())
                    .unwrap();
                w.write_all(content.as_bytes()).unwrap();
            }
            w.finish().unwrap();
        }
        buf
    }

    #[test]
    fn fabric_mod_metadata_parses() {
        let bytes = write_jar(&[(
            "fabric.mod.json",
            r#"{"id":"mymod","name":"My Mod","version":"1.0.0","description":"Demo","authors":["Bob"],"depends":{"minecraft":">=1.20.4","fabric-api":"*"}}"#,
        )]);
        let mut a = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let m = parse_mod_jar(&mut a).unwrap();
        assert_eq!(m.loader, "fabric");
        assert_eq!(m.mod_id, "mymod");
        assert_eq!(m.display_name, "My Mod");
        assert_eq!(m.minecraft_version_range, ">=1.20.4");
        assert_eq!(m.dependencies.len(), 2);
    }

    #[test]
    fn forge_mods_toml_parses() {
        let bytes = write_jar(&[(
            "META-INF/mods.toml",
            r#"
modLoader="javafml"
loaderVersion="[47,)"
[[mods]]
modId="mymod"
displayName="My Forge Mod"
version="2.0.0"
authors="Alice,Bob"

[[dependencies.mymod]]
modId="minecraft"
versionRange="[1.20,1.21)"
mandatory=true
"#,
        )]);
        let mut a = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let m = parse_mod_jar(&mut a).unwrap();
        assert_eq!(m.loader, "forge");
        assert_eq!(m.mod_id, "mymod");
        assert_eq!(m.minecraft_version_range, "[1.20,1.21)");
        assert!(m.authors.contains(&"Alice".to_string()));
    }

    #[test]
    fn classifies_assets_and_data() {
        let bytes = write_jar(&[
            ("fabric.mod.json", r#"{"id":"mymod","version":"1"}"#),
            ("assets/mymod/blockstates/ruby_block.json", "{}"),
            ("assets/mymod/models/block/ruby_block.json", "{}"),
            ("assets/mymod/models/item/ruby.json", "{}"),
            ("assets/mymod/textures/block/ruby_block.png", "fake"),
            ("assets/mymod/textures/item/ruby.png", "fake"),
            ("assets/mymod/lang/en_us.json", "{}"),
            ("data/mymod/recipe/ruby_block.json", "{}"),
            ("data/mymod/loot_table/blocks/ruby_block.json", "{}"),
            ("data/mymod/advancement/got_ruby.json", "{}"),
            ("data/mymod/worldgen/biome/ruby_glade.json", "{}"),
            ("data/mymod/worldgen/configured_feature/ruby_ore.json", "{}"),
            ("com/example/mymod/RubyMod.class", "fake"),
            ("com/example/mymod/block/RubyBlock.class", "fake"),
        ]);
        let mut a = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let m = parse_mod_jar(&mut a).unwrap();
        assert_eq!(m.feature_counts.blockstates, 1);
        assert_eq!(m.feature_counts.models_block, 1);
        assert_eq!(m.feature_counts.models_item, 1);
        assert_eq!(m.feature_counts.textures_block, 1);
        assert_eq!(m.feature_counts.textures_item, 1);
        assert_eq!(m.feature_counts.lang_files, 1);
        assert_eq!(m.feature_counts.recipes, 1);
        assert_eq!(m.feature_counts.loot_tables, 1);
        assert_eq!(m.feature_counts.advancements, 1);
        assert_eq!(m.feature_counts.biomes, 1);
        assert_eq!(m.feature_counts.worldgen_features, 1);
        assert_eq!(m.total_classes, 2);
        assert!(m.java_packages.contains_key("com.example.mymod"));
        assert!(m.java_packages.contains_key("com.example.mymod.block"));
    }

    #[test]
    fn curseforge_manifest_parses() {
        let p = parse_curseforge_manifest(
            r#"{
                "name":"My Pack","version":"1.0","author":"Alice",
                "minecraft":{"version":"1.20.1","modLoaders":[{"id":"forge-47.2.0","primary":true}]},
                "files":[
                    {"projectID":12345,"fileID":67890,"required":true},
                    {"projectID":11111,"fileID":22222,"required":false}
                ]
            }"#,
        );
        assert_eq!(p.format, "curseforge");
        assert_eq!(p.loader, "forge");
        assert_eq!(p.minecraft_version, "1.20.1");
        assert_eq!(p.mod_count, 2);
    }
}
