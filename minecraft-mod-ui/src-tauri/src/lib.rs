pub mod db;
pub mod watcher;
pub mod codegen;
pub mod commands;
pub mod resources;
pub mod feature_system;
pub mod mod_importer;

use std::sync::Arc;
use commands::project_commands::DbState;
use commands::watcher_commands::WatcherState;
use tauri::Manager;

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
        .manage(WatcherState::default())
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Load the sidecar resource bundle (studio.bin) on startup. The
            // bin lives next to the executable as configured in
            // tauri.conf.json -> bundle.resources, so resource_dir() resolves
            // to the directory containing both files.
            if let Ok(resource_dir) = app.path().resource_dir() {
                let bin = resource_dir.join("studio.bin");
                let manifest = resource_dir.join("manifest.json");
                if bin.exists() && manifest.exists() {
                    if let Err(e) = resources::init(bin, manifest) {
                        log::warn!("Resource bundle failed to load: {}", e);
                    } else {
                        log::info!("Resource bundle loaded ({} entries)", resources::list().len());
                    }
                } else {
                    log::warn!("studio.bin / manifest.json not found in resource_dir");
                }
            }

            log::info!("Minecraft Mod Studio started!");
            log::info!("Database path: {:?}", db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            commands::project_commands::create_project,
            commands::project_commands::update_project,
            commands::project_commands::get_projects,
            commands::project_commands::get_project,
            commands::project_commands::delete_project,
            // Asset commands — Block
            commands::asset_commands::create_block,
            commands::asset_commands::update_block,
            commands::asset_commands::delete_block,
            commands::asset_commands::get_block,
            commands::asset_commands::get_blocks,
            // Asset commands — Item
            commands::asset_commands::create_item,
            commands::asset_commands::update_item,
            commands::asset_commands::delete_item,
            commands::asset_commands::get_item,
            commands::asset_commands::get_items,
            // Visual graph commands
            commands::graph_commands::save_visual_graph,
            commands::graph_commands::get_visual_graphs,
            // Codegen commands
            commands::codegen_commands::generate_event_handlers,
            commands::codegen_commands::generate_block_class,
            commands::codegen_commands::generate_item_class,
            commands::codegen_commands::write_generated_file,
            // Scaffold commands
            commands::scaffold_commands::scaffold_project,
            commands::scaffold_commands::get_project_path,
            // Build commands
            commands::build_commands::run_gradle_build,
            commands::build_commands::check_java_version,
            // Resource commands
            commands::resource_commands::get_resource_text,
            commands::resource_commands::list_resources,
            // File watcher commands
            commands::watcher_commands::start_watching,
            commands::watcher_commands::stop_watching,
            // Feature catalog commands
            commands::feature_commands::list_features,
            commands::feature_commands::generate_feature_skeleton,
            // Recipe commands
            commands::recipe_commands::create_recipe,
            commands::recipe_commands::update_recipe,
            commands::recipe_commands::delete_recipe,
            commands::recipe_commands::get_recipe,
            commands::recipe_commands::get_recipes,
            commands::recipe_commands::generate_recipe_json,
            // World-data (Entity / Biome / Dimension / Advancement)
            commands::world_data_commands::save_asset,
            commands::world_data_commands::delete_asset,
            commands::world_data_commands::get_asset,
            commands::world_data_commands::get_assets,
            commands::world_data_commands::generate_entity_class,
            commands::world_data_commands::generate_biome_json,
            commands::world_data_commands::generate_dimension_json,
            commands::world_data_commands::generate_advancement_json,
            // Enchantment
            commands::enchantment_commands::generate_enchantment_class,
            // Item variants (Tool / Armor / Food)
            commands::item_variants::generate_tool_class,
            commands::item_variants::generate_armor_class,
            commands::item_variants::generate_food_class,
            // Dependency resolver
            commands::dependency_commands::list_dependencies,
            commands::dependency_commands::resolve_dependency,
            // Mod / modpack importer
            commands::import_commands::import_mod_or_pack,
            commands::import_commands::extract_jar_file,
            // Vanilla+ template library
            commands::vanilla_plus_commands::generate_vanilla_plus_variants,
            // Worldgen feature codegen
            commands::worldgen_commands::generate_worldgen_feature,
            // Loot table codegen
            commands::loot_table_commands::generate_loot_table_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
