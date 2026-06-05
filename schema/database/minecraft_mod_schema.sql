-- ============================================================
-- MINECRAFT MOD GENERATOR - COMPLETE DATABASE SCHEMA
-- SQLite Database for Mod Projects Management
-- ============================================================

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- Projects Table - Asosiy mod loyihalari
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    minecraft_version TEXT NOT NULL,
    mod_loader TEXT NOT NULL CHECK(mod_loader IN ('fabric', 'forge', 'neoforge')),
    mod_version TEXT NOT NULL,
    author TEXT NOT NULL,
    namespace TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    build_count INTEGER DEFAULT 0,
    last_build_at DATETIME,
    is_archived BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_minecraft_version ON projects(minecraft_version);
CREATE INDEX IF NOT EXISTS idx_projects_mod_loader ON projects(mod_loader);


-- ============================================================
-- 2. BLOCKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    block_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    hardness REAL NOT NULL DEFAULT 1.5,
    resistance REAL NOT NULL DEFAULT 6.0,
    slipperiness REAL NOT NULL DEFAULT 0.6,
    speed_factor REAL NOT NULL DEFAULT 1.0,
    friction_factor REAL NOT NULL DEFAULT 0.4,
    luminance INTEGER DEFAULT 0,
    is_replaceable BOOLEAN DEFAULT 0,
    is_solid BOOLEAN DEFAULT 1,
    has_collision BOOLEAN DEFAULT 1,
    is_full_block BOOLEAN DEFAULT 1,
    has_gravity BOOLEAN DEFAULT 0,
    is_flammable BOOLEAN DEFAULT 0,
    flammability_level INTEGER DEFAULT 0,
    fire_spreadability INTEGER DEFAULT 0,
    can_be_hydrated BOOLEAN DEFAULT 0,
    texture_top TEXT,
    texture_bottom TEXT,
    texture_side TEXT,
    texture_all TEXT,
    custom_model_data INTEGER,
    material_type TEXT CHECK(material_type IN ('stone', 'dirt', 'wood', 'ore', 'metal', 'glass', 'fabric', 'decorative', 'other')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, namespace, block_name)
);

CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_blocks_namespace ON blocks(namespace);


-- ============================================================
-- 3. ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    max_stack_size INTEGER NOT NULL DEFAULT 64,
    rarity TEXT DEFAULT 'common' CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    is_enchantable BOOLEAN DEFAULT 1,
    is_consumable BOOLEAN DEFAULT 0,
    food_nutrition INTEGER,
    food_saturation REAL,
    is_weapon BOOLEAN DEFAULT 0,
    is_armor BOOLEAN DEFAULT 0,
    is_tool BOOLEAN DEFAULT 0,
    durability INTEGER,
    attack_damage REAL,
    attack_speed REAL DEFAULT 4.0,
    texture_path TEXT,
    custom_model_data INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, namespace, item_name)
);

CREATE INDEX IF NOT EXISTS idx_items_project_id ON items(project_id);
CREATE INDEX IF NOT EXISTS idx_items_namespace ON items(namespace);


-- ============================================================
-- 4. ENCHANTMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS enchantments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    enchantment_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    description TEXT,
    max_level INTEGER NOT NULL DEFAULT 1,
    is_treasure BOOLEAN DEFAULT 0,
    is_curse BOOLEAN DEFAULT 0,
    can_anvil_merge BOOLEAN DEFAULT 1,
    anvil_cost INTEGER DEFAULT 1,
    weight INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, namespace, enchantment_name)
);

CREATE INDEX IF NOT EXISTS idx_enchantments_project_id ON enchantments(project_id);


-- ============================================================
-- 5. RECIPES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    recipe_name TEXT NOT NULL,
    output_item_id INTEGER,
    output_block_id INTEGER,
    output_count INTEGER DEFAULT 1,
    recipe_type TEXT NOT NULL CHECK(recipe_type IN ('shaped', 'shapeless', 'smelting', 'smoking', 'blasting', 'campfire', 'stonecutting', 'smithing')),
    cook_time INTEGER,
    experience REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(output_item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(output_block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_project_id ON recipes(project_id);
CREATE INDEX IF NOT EXISTS idx_recipes_recipe_type ON recipes(recipe_type);


-- ============================================================
-- 6. RECIPE INGREDIENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    item_id INTEGER,
    block_id INTEGER,
    tag_name TEXT,
    count INTEGER DEFAULT 1,
    position INTEGER,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);


-- ============================================================
-- 7. ARMOR TYPES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS armor_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    armor_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    helmet_item_id INTEGER,
    chestplate_item_id INTEGER,
    leggings_item_id INTEGER,
    boots_item_id INTEGER,
    armor_value_total INTEGER NOT NULL,
    toughness_value REAL DEFAULT 0.0,
    knockback_resistance REAL DEFAULT 0.0,
    durability INTEGER NOT NULL,
    enchantability INTEGER DEFAULT 10,
    repair_item_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(helmet_item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(chestplate_item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(leggings_item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(boots_item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(repair_item_id) REFERENCES items(id) ON DELETE SET NULL,
    UNIQUE(project_id, namespace, armor_name)
);

CREATE INDEX IF NOT EXISTS idx_armor_types_project_id ON armor_types(project_id);


-- ============================================================
-- 8. TOOL TYPES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tool_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    tool_item_id INTEGER NOT NULL,
    tool_type TEXT NOT NULL CHECK(tool_type IN ('pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'polearm', 'other')),
    harvest_level INTEGER DEFAULT 0,
    harvest_speed REAL DEFAULT 1.0,
    attack_damage REAL NOT NULL,
    attack_speed REAL NOT NULL DEFAULT 4.0,
    durability INTEGER NOT NULL,
    enchantability INTEGER DEFAULT 10,
    repair_item_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(tool_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(repair_item_id) REFERENCES items(id) ON DELETE SET NULL,
    UNIQUE(project_id, namespace, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_tool_types_project_id ON tool_types(project_id);


-- ============================================================
-- 9. ENTITY TYPES TABLE (Mobs)
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    entity_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    display_name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('hostile', 'passive', 'neutral', 'boss', 'other')),
    max_health REAL NOT NULL DEFAULT 20.0,
    armor_value INTEGER DEFAULT 0,
    armor_toughness REAL DEFAULT 0.0,
    knockback_resistance REAL DEFAULT 0.0,
    attack_damage REAL,
    attack_speed REAL DEFAULT 4.0,
    movement_speed REAL DEFAULT 0.1,
    follow_range REAL DEFAULT 16.0,
    spawn_weight INTEGER,
    spawn_type TEXT CHECK(spawn_type IN ('natural', 'egg', 'spawner', 'none')),
    spawn_group TEXT,
    min_group_size INTEGER DEFAULT 1,
    max_group_size INTEGER DEFAULT 1,
    texture_path TEXT,
    model_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, namespace, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_entity_types_project_id ON entity_types(project_id);


-- ============================================================
-- 10. DROPS TABLE (Entity Drops & Loot Tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    drop_item_id INTEGER,
    drop_block_id INTEGER,
    min_count INTEGER DEFAULT 1,
    max_count INTEGER DEFAULT 1,
    drop_chance REAL DEFAULT 1.0,
    requires_player_kill BOOLEAN DEFAULT 1,
    drop_level_bonus_multiplier REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entity_id) REFERENCES entity_types(id) ON DELETE CASCADE,
    FOREIGN KEY(drop_item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY(drop_block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_drops_entity_id ON drops(entity_id);


-- ============================================================
-- 11. BIOMES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS biomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    biome_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    temperature REAL NOT NULL DEFAULT 0.8,
    humidity REAL NOT NULL DEFAULT 0.4,
    precipitation TEXT DEFAULT 'rain' CHECK(precipitation IN ('rain', 'snow', 'none')),
    grass_color_rgb TEXT,
    foliage_color_rgb TEXT,
    water_color_rgb TEXT,
    sky_color_rgb TEXT,
    fog_color_rgb TEXT,
    ambient_mood_sound TEXT,
    music_track TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, namespace, biome_name)
);

CREATE INDEX IF NOT EXISTS idx_biomes_project_id ON biomes(project_id);


-- ============================================================
-- 12. DIMENSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS dimensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    dimension_name TEXT NOT NULL,
    namespace TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    dimension_type TEXT NOT NULL CHECK(dimension_type IN ('overworld', 'nether', 'end', 'custom')),
    is_natural BOOLEAN DEFAULT 0,
    has_ceiling BOOLEAN DEFAULT 0,
    ultra_warm BOOLEAN DEFAULT 0,
    has_raids BOOLEAN DEFAULT 0,
    respawn_anchor_works BOOLEAN DEFAULT 0,
    bed_works BOOLEAN DEFAULT 1,
    has_skylight BOOLEAN DEFAULT 1,
    has_fixed_time BOOLEAN DEFAULT 0,
    fixed_time INTEGER,
    piglin_safe BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, namespace, dimension_name)
);

CREATE INDEX IF NOT EXISTS idx_dimensions_project_id ON dimensions(project_id);


-- ============================================================
-- 13. AI AGENT TASKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    task_type TEXT NOT NULL CHECK(task_type IN ('code_generation', 'file_creation', 'model_creation', 'texture_generation', 'config_generation', 'review', 'other')),
    agent_type TEXT NOT NULL CHECK(agent_type IN ('architect', 'logic', 'ui', 'reviewer')),
    input_data TEXT NOT NULL,
    output_data TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_project_id ON agent_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);


-- ============================================================
-- 14. BUILD LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS build_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    build_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'warning')),
    log_content TEXT NOT NULL,
    error_summary TEXT,
    warnings_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    build_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, build_number)
);

CREATE INDEX IF NOT EXISTS idx_build_logs_project_id ON build_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_build_logs_status ON build_logs(status);


-- ============================================================
-- 15. PROJECT DEPENDENCIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS project_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    dependency_name TEXT NOT NULL,
    dependency_type TEXT NOT NULL CHECK(dependency_type IN ('lib', 'mod', 'gradle_plugin')),
    version TEXT NOT NULL,
    repository TEXT,
    is_optional BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, dependency_name, version)
);

CREATE INDEX IF NOT EXISTS idx_project_dependencies_project_id ON project_dependencies(project_id);


-- ============================================================
-- 16. PROJECT SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS project_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE,
    java_version TEXT DEFAULT '17',
    gradle_version TEXT DEFAULT '8.0',
    source_set_main TEXT DEFAULT 'src/main',
    source_set_test TEXT DEFAULT 'src/test',
    output_directory TEXT DEFAULT 'build/libs',
    enable_mixins BOOLEAN DEFAULT 0,
    enable_access_transformer BOOLEAN DEFAULT 0,
    enable_coremods BOOLEAN DEFAULT 0,
    optimization_level TEXT DEFAULT 'balanced' CHECK(optimization_level IN ('debug', 'balanced', 'release')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);


-- ============================================================
-- 17. FILE VERSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS file_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT 1,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, file_path, version_number)
);

CREATE INDEX IF NOT EXISTS idx_file_versions_project_id ON file_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_path ON file_versions(file_path);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp for projects
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update updated_at timestamp for blocks
CREATE TRIGGER IF NOT EXISTS update_blocks_timestamp
AFTER UPDATE ON blocks
BEGIN
    UPDATE blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update updated_at timestamp for items
CREATE TRIGGER IF NOT EXISTS update_items_timestamp
AFTER UPDATE ON items
BEGIN
    UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update project's last_build_at when build_logs are created
CREATE TRIGGER IF NOT EXISTS update_project_last_build
AFTER INSERT ON build_logs
BEGIN
    UPDATE projects SET last_build_at = CURRENT_TIMESTAMP WHERE id = NEW.project_id;
END;

-- Auto-increment build_count when new build succeeds
CREATE TRIGGER IF NOT EXISTS increment_build_count
AFTER INSERT ON build_logs
WHEN NEW.status = 'success'
BEGIN
    UPDATE projects SET build_count = build_count + 1 WHERE id = NEW.project_id;
END;


-- ============================================================
-- VIEWS
-- ============================================================

-- Complete Project Overview
CREATE VIEW IF NOT EXISTS v_project_overview AS
SELECT 
    p.id,
    p.name,
    p.namespace,
    p.minecraft_version,
    p.mod_loader,
    p.mod_version,
    COUNT(DISTINCT b.id) as block_count,
    COUNT(DISTINCT i.id) as item_count,
    COUNT(DISTINCT e.id) as enchantment_count,
    COUNT(DISTINCT r.id) as recipe_count,
    COUNT(DISTINCT et.id) as entity_count,
    p.build_count,
    p.last_build_at,
    p.created_at
FROM projects p
LEFT JOIN blocks b ON p.id = b.project_id
LEFT JOIN items i ON p.id = i.project_id
LEFT JOIN enchantments e ON p.id = e.project_id
LEFT JOIN recipes r ON p.id = r.project_id
LEFT JOIN entity_types et ON p.id = et.project_id
GROUP BY p.id;

-- Block Details with Block Count
CREATE VIEW IF NOT EXISTS v_blocks_detailed AS
SELECT 
    b.*,
    p.name as project_name,
    p.minecraft_version
FROM blocks b
JOIN projects p ON b.project_id = p.id;

-- Items with Recipe Count
CREATE VIEW IF NOT EXISTS v_items_with_recipes AS
SELECT 
    i.*,
    p.name as project_name,
    COUNT(r.id) as used_in_recipes
FROM items i
JOIN projects p ON i.project_id = p.id
LEFT JOIN recipes r ON r.output_item_id = i.id
GROUP BY i.id;

-- Recent Build History
CREATE VIEW IF NOT EXISTS v_recent_builds AS
SELECT 
    bl.*,
    p.name as project_name
FROM build_logs bl
JOIN projects p ON bl.project_id = p.id
ORDER BY bl.created_at DESC
LIMIT 20;

-- Agent Task Status Summary
CREATE VIEW IF NOT EXISTS v_agent_task_status AS
SELECT 
    p.name as project_name,
    agent_type,
    task_type,
    status,
    COUNT(*) as task_count,
    AVG(retry_count) as avg_retries
FROM agent_tasks at
JOIN projects p ON at.project_id = p.id
GROUP BY p.id, agent_type, task_type, status;
