//! Tauri commands for the Mod / Modpack Importer.
//!
//! `import_mod_or_pack(path)` opens a `.jar` (mod) or `.zip` (modpack /
//! resource pack) and returns the structured inventory the frontend
//! renders in the new "Open Mod" panel.
//!
//! `extract_jar_file(path, internal_path, target_dir)` lets the user
//! pull a single file out of an imported jar (e.g. "I want to copy
//! this recipe into my own mod") without unpacking the whole archive.

use std::path::{Path, PathBuf};

use crate::mod_importer::{import_archive, ImportArchiveResult};

#[tauri::command]
pub async fn import_mod_or_pack(path: String) -> Result<ImportArchiveResult, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    if !p.is_file() {
        return Err(format!("Not a regular file: {}", path));
    }
    import_archive(&p)
}

#[tauri::command]
pub async fn extract_jar_file(
    jar_path: String,
    internal_path: String,
    target_dir: String,
) -> Result<String, String> {
    let jar = PathBuf::from(&jar_path);
    if !jar.exists() {
        return Err(format!("Jar does not exist: {}", jar_path));
    }
    if internal_path.contains("..") || internal_path.starts_with('/') {
        return Err(format!("Refusing to extract suspicious path: {}", internal_path));
    }

    let file = std::fs::File::open(&jar).map_err(|e| format!("open jar: {}", e))?;
    let mut archive = zip::ZipArchive::new(std::io::BufReader::new(file))
        .map_err(|e| format!("not a valid zip/jar: {}", e))?;

    let mut entry = archive
        .by_name(&internal_path)
        .map_err(|e| format!("entry {} not found: {}", internal_path, e))?;

    let safe_filename = Path::new(&internal_path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("extracted.bin")
        .to_string();

    let target_root = PathBuf::from(&target_dir);
    std::fs::create_dir_all(&target_root)
        .map_err(|e| format!("create target dir: {}", e))?;
    let absolute = target_root.join(&safe_filename);

    let mut out = std::fs::File::create(&absolute)
        .map_err(|e| format!("create {:?}: {}", absolute, e))?;
    std::io::copy(&mut entry, &mut out).map_err(|e| format!("write extracted file: {}", e))?;

    Ok(absolute.to_string_lossy().to_string())
}
