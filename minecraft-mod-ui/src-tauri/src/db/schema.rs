use rusqlite::Connection;

/// Create all database tables for the Minecraft Mod Studio
pub fn create_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Projects table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            minecraft_version TEXT NOT NULL DEFAULT '1.20.4',
            mod_loader TEXT NOT NULL DEFAULT 'forge',
            mod_version TEXT NOT NULL DEFAULT '1.0.0',
            author TEXT NOT NULL DEFAULT '',
            namespace TEXT NOT NULL,
            build_count INTEGER NOT NULL DEFAULT 0,
            last_build_at TEXT,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // Registry - tracks all mod assets
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            asset_type TEXT NOT NULL,
            asset_name TEXT NOT NULL,
            namespace TEXT NOT NULL,
            display_name TEXT,
            file_path TEXT,
            metadata TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Blocks table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            block_name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            namespace TEXT NOT NULL,
            hardness REAL NOT NULL DEFAULT 1.5,
            resistance REAL NOT NULL DEFAULT 6.0,
            slipperiness REAL NOT NULL DEFAULT 0.6,
            speed_factor REAL NOT NULL DEFAULT 1.0,
            luminance INTEGER NOT NULL DEFAULT 0,
            is_solid INTEGER NOT NULL DEFAULT 1,
            has_collision INTEGER NOT NULL DEFAULT 1,
            has_gravity INTEGER NOT NULL DEFAULT 0,
            is_flammable INTEGER NOT NULL DEFAULT 0,
            material_type TEXT NOT NULL DEFAULT 'stone',
            texture_top TEXT,
            texture_bottom TEXT,
            texture_side TEXT,
            texture_all TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Items table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            namespace TEXT NOT NULL,
            max_stack_size INTEGER NOT NULL DEFAULT 64,
            rarity TEXT NOT NULL DEFAULT 'common',
            is_enchantable INTEGER NOT NULL DEFAULT 1,
            is_consumable INTEGER NOT NULL DEFAULT 0,
            food_nutrition INTEGER,
            food_saturation REAL,
            is_weapon INTEGER NOT NULL DEFAULT 0,
            is_armor INTEGER NOT NULL DEFAULT 0,
            is_tool INTEGER NOT NULL DEFAULT 0,
            durability INTEGER,
            attack_damage REAL,
            attack_speed REAL NOT NULL DEFAULT 4.0,
            texture_path TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Entities table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            entity_name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            namespace TEXT NOT NULL,
            entity_type TEXT NOT NULL DEFAULT 'passive',
            max_health REAL NOT NULL DEFAULT 20.0,
            armor_value REAL NOT NULL DEFAULT 0.0,
            armor_toughness REAL NOT NULL DEFAULT 0.0,
            knockback_resistance REAL NOT NULL DEFAULT 0.0,
            attack_damage REAL,
            attack_speed REAL NOT NULL DEFAULT 1.0,
            movement_speed REAL NOT NULL DEFAULT 0.3,
            follow_range REAL NOT NULL DEFAULT 16.0,
            spawn_weight INTEGER,
            spawn_type TEXT NOT NULL DEFAULT 'natural',
            min_group_size INTEGER NOT NULL DEFAULT 1,
            max_group_size INTEGER NOT NULL DEFAULT 4,
            texture_path TEXT,
            model_path TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Visual nodes data - stores node editor graphs
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS visual_nodes_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            graph_name TEXT NOT NULL,
            graph_type TEXT NOT NULL DEFAULT 'event_handler',
            nodes_json TEXT NOT NULL DEFAULT '[]',
            edges_json TEXT NOT NULL DEFAULT '[]',
            viewport_json TEXT NOT NULL DEFAULT '{}',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Dependency graph - tracks relationships between assets
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS dependency_graph (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            source_type TEXT NOT NULL,
            source_id INTEGER NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            relationship TEXT NOT NULL DEFAULT 'depends_on',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // AI history logs
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ai_history_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            agent_type TEXT NOT NULL,
            task_type TEXT NOT NULL,
            input_data TEXT,
            output_data TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            error_message TEXT,
            execution_time_ms INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            completed_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Build logs
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS build_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            build_number INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            log_content TEXT,
            error_summary TEXT,
            warnings_count INTEGER NOT NULL DEFAULT 0,
            errors_count INTEGER NOT NULL DEFAULT 0,
            build_time_ms INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // Recipes table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            recipe_name TEXT NOT NULL,
            recipe_type TEXT NOT NULL DEFAULT 'shaped',
            output_item_id INTEGER,
            output_block_id INTEGER,
            output_count INTEGER NOT NULL DEFAULT 1,
            cook_time INTEGER,
            experience REAL NOT NULL DEFAULT 0.0,
            pattern_json TEXT,
            ingredients_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );"
    )?;

    // File registry - tracks actual files on disk
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS file_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            last_modified TEXT,
            checksum TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, file_path)
        );"
    )?;

    // Create indexes for performance
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_registry_project ON registry(project_id);
         CREATE INDEX IF NOT EXISTS idx_registry_type ON registry(asset_type);
         CREATE INDEX IF NOT EXISTS idx_blocks_project ON blocks(project_id);
         CREATE INDEX IF NOT EXISTS idx_items_project ON items(project_id);
         CREATE INDEX IF NOT EXISTS idx_entities_project ON entities(project_id);
         CREATE INDEX IF NOT EXISTS idx_visual_nodes_project ON visual_nodes_data(project_id);
         CREATE INDEX IF NOT EXISTS idx_dependency_project ON dependency_graph(project_id);
         CREATE INDEX IF NOT EXISTS idx_file_registry_project ON file_registry(project_id);
         CREATE INDEX IF NOT EXISTS idx_build_logs_project ON build_logs(project_id);"
    )?;

    Ok(())
}
