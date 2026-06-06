pub mod db;
pub mod watcher;
pub mod codegen;
pub mod commands;

use std::sync::Arc;
use commands::project_commands::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Determine database path
    let app_dir = dirs_next::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("minecraft-mod-studio");

    let db_path = app_dir.join("studio.db");

    // Initialize database
    let database = db::Database::new(&db_path).expect("Failed to initialize database");
    let db_state = DbState(Arc::new(database));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db_state)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            log::info!("Minecraft Mod Studio started!");
            log::info!("Database path: {:?}", db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            commands::project_commands::create_project,
            commands::project_commands::get_projects,
            commands::project_commands::get_project,
            commands::project_commands::delete_project,
            // Asset commands
            commands::asset_commands::create_block,
            commands::asset_commands::get_blocks,
            commands::asset_commands::create_item,
            // Graph commands
            commands::graph_commands::save_visual_graph,
            commands::graph_commands::get_visual_graphs,
            // Build commands
            commands::build_commands::run_gradle_build,
            commands::build_commands::check_java_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
