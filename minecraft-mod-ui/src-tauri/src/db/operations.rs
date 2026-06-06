use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::{Database, DbError};

// ==================== Project Operations ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub minecraft_version: String,
    pub mod_loader: String,
    pub mod_version: String,
    pub author: String,
    pub namespace: String,
    pub build_count: i32,
    pub is_archived: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Block {
    pub id: Option<i64>,
    pub project_id: i64,
    pub block_name: String,
    pub display_name: String,
    pub namespace: String,
    pub hardness: f64,
    pub resistance: f64,
    pub luminance: i32,
    pub is_solid: bool,
    pub has_collision: bool,
    pub has_gravity: bool,
    pub is_flammable: bool,
    pub material_type: String,
    pub texture_all: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: Option<i64>,
    pub project_id: i64,
    pub item_name: String,
    pub display_name: String,
    pub namespace: String,
    pub max_stack_size: i32,
    pub rarity: String,
    pub is_enchantable: bool,
    pub durability: Option<i32>,
    pub attack_damage: Option<f64>,
    pub texture_path: Option<String>,

    // Extended item rules (PR #24).
    // Every field is optional / has a sensible default so older callers
    // that only set the legacy fields keep working.
    #[serde(default)]
    pub has_glint: bool,
    #[serde(default)]
    pub is_fire_resistant: bool,
    pub food_eat_seconds: Option<f64>,
    #[serde(default)]
    pub food_always_eat: bool,
    #[serde(default)]
    pub food_eat_fast: bool,
    pub food_effects_json: Option<String>,
    pub tool_kind: Option<String>,
    pub tool_tier: Option<String>,
    pub armor_material: Option<String>,
    pub armor_slot: Option<String>,
    pub armor_defense: Option<i32>,
    pub armor_toughness: Option<f64>,
    pub knockback_resistance: Option<f64>,
    pub attribute_modifiers_json: Option<String>,
    pub tags_json: Option<String>,
    pub custom_nbt_json: Option<String>,
    pub tooltip_lines_json: Option<String>,
    pub uses_remaining: Option<i32>,
    pub cooldown_ticks: Option<i32>,
    pub burn_time_ticks: Option<i32>,
    pub repair_ingredient: Option<String>,
    pub recipe_remainder: Option<String>,
}

impl Default for Item {
    fn default() -> Self {
        Self {
            id: None,
            project_id: 0,
            item_name: String::new(),
            display_name: String::new(),
            namespace: String::new(),
            max_stack_size: 64,
            rarity: "common".into(),
            is_enchantable: true,
            durability: None,
            attack_damage: None,
            texture_path: None,
            has_glint: false,
            is_fire_resistant: false,
            food_eat_seconds: None,
            food_always_eat: false,
            food_eat_fast: false,
            food_effects_json: None,
            tool_kind: None,
            tool_tier: None,
            armor_material: None,
            armor_slot: None,
            armor_defense: None,
            armor_toughness: None,
            knockback_resistance: None,
            attribute_modifiers_json: None,
            tags_json: None,
            custom_nbt_json: None,
            tooltip_lines_json: None,
            uses_remaining: None,
            cooldown_ticks: None,
            burn_time_ticks: None,
            repair_ingredient: None,
            recipe_remainder: None,
        }
    }
}

impl Item {
    /// Materialise an Item from a SELECT row that includes ALL extended
    /// columns. Keep this in sync with the SELECT statements in
    /// `get_item` / `get_items`.
    pub(crate) fn from_full_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Item {
            id: Some(row.get(0)?),
            project_id: row.get(1)?,
            item_name: row.get(2)?,
            display_name: row.get(3)?,
            namespace: row.get(4)?,
            max_stack_size: row.get(5)?,
            rarity: row.get(6)?,
            is_enchantable: row.get::<_, i32>(7)? != 0,
            durability: row.get(8)?,
            attack_damage: row.get(9)?,
            texture_path: row.get(10)?,
            has_glint: row.get::<_, i32>(11)? != 0,
            is_fire_resistant: row.get::<_, i32>(12)? != 0,
            food_eat_seconds: row.get(13)?,
            food_always_eat: row.get::<_, i32>(14)? != 0,
            food_eat_fast: row.get::<_, i32>(15)? != 0,
            food_effects_json: row.get(16)?,
            tool_kind: row.get(17)?,
            tool_tier: row.get(18)?,
            armor_material: row.get(19)?,
            armor_slot: row.get(20)?,
            armor_defense: row.get(21)?,
            armor_toughness: row.get(22)?,
            knockback_resistance: row.get(23)?,
            attribute_modifiers_json: row.get(24)?,
            tags_json: row.get(25)?,
            custom_nbt_json: row.get(26)?,
            tooltip_lines_json: row.get(27)?,
            uses_remaining: row.get(28)?,
            cooldown_ticks: row.get(29)?,
            burn_time_ticks: row.get(30)?,
            repair_ingredient: row.get(31)?,
            recipe_remainder: row.get(32)?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VisualGraph {
    pub id: Option<i64>,
    pub project_id: i64,
    pub graph_name: String,
    pub graph_type: String,
    pub nodes_json: String,
    pub edges_json: String,
    pub viewport_json: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub id: Option<i64>,
    pub project_id: i64,
    pub file_path: String,
    pub file_type: String,
    pub file_size: Option<i64>,
    pub last_modified: Option<String>,
}

impl Database {
    // ===== Project CRUD =====

    pub fn create_project(&self, project: &Project) -> Result<i64, DbError> {
        let conn = self.connection()?;
        conn.execute(
            "INSERT INTO projects (name, description, minecraft_version, mod_loader, mod_version, author, namespace)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                project.name,
                project.description,
                project.minecraft_version,
                project.mod_loader,
                project.mod_version,
                project.author,
                project.namespace,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_project(&self, project: &Project) -> Result<(), DbError> {
        let id = project.id.ok_or_else(|| {
            DbError::Sqlite(rusqlite::Error::InvalidParameterName(
                "project.id is required for update".to_string(),
            ))
        })?;
        let conn = self.connection()?;
        conn.execute(
            "UPDATE projects SET
                name = ?1,
                description = ?2,
                minecraft_version = ?3,
                mod_loader = ?4,
                mod_version = ?5,
                author = ?6,
                namespace = ?7,
                updated_at = datetime('now')
             WHERE id = ?8",
            params![
                project.name,
                project.description,
                project.minecraft_version,
                project.mod_loader,
                project.mod_version,
                project.author,
                project.namespace,
                id,
            ],
        )?;
        Ok(())
    }

    pub fn increment_build_count(&self, project_id: i64) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            "UPDATE projects SET
                build_count = build_count + 1,
                last_build_at = datetime('now'),
                updated_at = datetime('now')
             WHERE id = ?1",
            params![project_id],
        )?;
        Ok(())
    }

    pub fn get_projects(&self) -> Result<Vec<Project>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, minecraft_version, mod_loader, mod_version, author, namespace, build_count, is_archived, created_at, updated_at
             FROM projects WHERE is_archived = 0 ORDER BY updated_at DESC"
        )?;

        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                description: row.get(2)?,
                minecraft_version: row.get(3)?,
                mod_loader: row.get(4)?,
                mod_version: row.get(5)?,
                author: row.get(6)?,
                namespace: row.get(7)?,
                build_count: row.get(8)?,
                is_archived: row.get::<_, i32>(9)? != 0,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(projects)
    }

    pub fn get_project(&self, id: i64) -> Result<Option<Project>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, minecraft_version, mod_loader, mod_version, author, namespace, build_count, is_archived, created_at, updated_at
             FROM projects WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(Project {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                description: row.get(2)?,
                minecraft_version: row.get(3)?,
                mod_loader: row.get(4)?,
                mod_version: row.get(5)?,
                author: row.get(6)?,
                namespace: row.get(7)?,
                build_count: row.get(8)?,
                is_archived: row.get::<_, i32>(9)? != 0,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        });

        match result {
            Ok(project) => Ok(Some(project)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    pub fn delete_project(&self, id: i64) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ===== Block CRUD =====

    pub fn create_block(&self, block: &Block) -> Result<i64, DbError> {
        let conn = self.connection()?;
        conn.execute(
            "INSERT INTO blocks (project_id, block_name, display_name, namespace, hardness, resistance, luminance, is_solid, has_collision, has_gravity, is_flammable, material_type, texture_all)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                block.project_id,
                block.block_name,
                block.display_name,
                block.namespace,
                block.hardness,
                block.resistance,
                block.luminance,
                block.is_solid as i32,
                block.has_collision as i32,
                block.has_gravity as i32,
                block.is_flammable as i32,
                block.material_type,
                block.texture_all,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_block(&self, block: &Block) -> Result<(), DbError> {
        let id = block.id.ok_or_else(|| {
            DbError::Sqlite(rusqlite::Error::InvalidParameterName(
                "block.id is required for update".to_string(),
            ))
        })?;
        let conn = self.connection()?;
        conn.execute(
            "UPDATE blocks SET
                block_name = ?1,
                display_name = ?2,
                namespace = ?3,
                hardness = ?4,
                resistance = ?5,
                luminance = ?6,
                is_solid = ?7,
                has_collision = ?8,
                has_gravity = ?9,
                is_flammable = ?10,
                material_type = ?11,
                texture_all = ?12,
                updated_at = datetime('now')
             WHERE id = ?13",
            params![
                block.block_name,
                block.display_name,
                block.namespace,
                block.hardness,
                block.resistance,
                block.luminance,
                block.is_solid as i32,
                block.has_collision as i32,
                block.has_gravity as i32,
                block.is_flammable as i32,
                block.material_type,
                block.texture_all,
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_block(&self, id: i64) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute("DELETE FROM blocks WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_block(&self, id: i64) -> Result<Option<Block>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, block_name, display_name, namespace, hardness, resistance, luminance, is_solid, has_collision, has_gravity, is_flammable, material_type, texture_all
             FROM blocks WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(Block {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                block_name: row.get(2)?,
                display_name: row.get(3)?,
                namespace: row.get(4)?,
                hardness: row.get(5)?,
                resistance: row.get(6)?,
                luminance: row.get(7)?,
                is_solid: row.get::<_, i32>(8)? != 0,
                has_collision: row.get::<_, i32>(9)? != 0,
                has_gravity: row.get::<_, i32>(10)? != 0,
                is_flammable: row.get::<_, i32>(11)? != 0,
                material_type: row.get(12)?,
                texture_all: row.get(13)?,
            })
        });

        match result {
            Ok(b) => Ok(Some(b)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    pub fn get_blocks(&self, project_id: i64) -> Result<Vec<Block>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, block_name, display_name, namespace, hardness, resistance, luminance, is_solid, has_collision, has_gravity, is_flammable, material_type, texture_all
             FROM blocks WHERE project_id = ?1 ORDER BY display_name"
        )?;

        let blocks = stmt.query_map(params![project_id], |row| {
            Ok(Block {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                block_name: row.get(2)?,
                display_name: row.get(3)?,
                namespace: row.get(4)?,
                hardness: row.get(5)?,
                resistance: row.get(6)?,
                luminance: row.get(7)?,
                is_solid: row.get::<_, i32>(8)? != 0,
                has_collision: row.get::<_, i32>(9)? != 0,
                has_gravity: row.get::<_, i32>(10)? != 0,
                is_flammable: row.get::<_, i32>(11)? != 0,
                material_type: row.get(12)?,
                texture_all: row.get(13)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(blocks)
    }

    // ===== Item CRUD =====

    pub fn create_item(&self, item: &Item) -> Result<i64, DbError> {
        let conn = self.connection()?;
        conn.execute(
            "INSERT INTO items (
                project_id, item_name, display_name, namespace,
                max_stack_size, rarity, is_enchantable,
                durability, attack_damage, texture_path,
                has_glint, is_fire_resistant,
                food_eat_seconds, food_always_eat, food_eat_fast, food_effects_json,
                tool_kind, tool_tier,
                armor_material, armor_slot, armor_defense, armor_toughness, knockback_resistance,
                attribute_modifiers_json, tags_json, custom_nbt_json, tooltip_lines_json,
                uses_remaining, cooldown_ticks, burn_time_ticks,
                repair_ingredient, recipe_remainder
            ) VALUES (
                ?1, ?2, ?3, ?4,
                ?5, ?6, ?7,
                ?8, ?9, ?10,
                ?11, ?12,
                ?13, ?14, ?15, ?16,
                ?17, ?18,
                ?19, ?20, ?21, ?22, ?23,
                ?24, ?25, ?26, ?27,
                ?28, ?29, ?30,
                ?31, ?32
            )",
            params![
                item.project_id, item.item_name, item.display_name, item.namespace,
                item.max_stack_size, item.rarity, item.is_enchantable as i32,
                item.durability, item.attack_damage, item.texture_path,
                item.has_glint as i32, item.is_fire_resistant as i32,
                item.food_eat_seconds, item.food_always_eat as i32,
                item.food_eat_fast as i32, item.food_effects_json,
                item.tool_kind, item.tool_tier,
                item.armor_material, item.armor_slot,
                item.armor_defense, item.armor_toughness, item.knockback_resistance,
                item.attribute_modifiers_json, item.tags_json, item.custom_nbt_json,
                item.tooltip_lines_json,
                item.uses_remaining, item.cooldown_ticks, item.burn_time_ticks,
                item.repair_ingredient, item.recipe_remainder,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_item(&self, item: &Item) -> Result<(), DbError> {
        let id = item.id.ok_or_else(|| {
            DbError::Sqlite(rusqlite::Error::InvalidParameterName(
                "item.id is required for update".to_string(),
            ))
        })?;
        let conn = self.connection()?;
        conn.execute(
            "UPDATE items SET
                item_name = ?1, display_name = ?2, namespace = ?3,
                max_stack_size = ?4, rarity = ?5, is_enchantable = ?6,
                durability = ?7, attack_damage = ?8, texture_path = ?9,
                has_glint = ?10, is_fire_resistant = ?11,
                food_eat_seconds = ?12, food_always_eat = ?13,
                food_eat_fast = ?14, food_effects_json = ?15,
                tool_kind = ?16, tool_tier = ?17,
                armor_material = ?18, armor_slot = ?19,
                armor_defense = ?20, armor_toughness = ?21, knockback_resistance = ?22,
                attribute_modifiers_json = ?23, tags_json = ?24, custom_nbt_json = ?25,
                tooltip_lines_json = ?26,
                uses_remaining = ?27, cooldown_ticks = ?28, burn_time_ticks = ?29,
                repair_ingredient = ?30, recipe_remainder = ?31,
                updated_at = datetime('now')
             WHERE id = ?32",
            params![
                item.item_name, item.display_name, item.namespace,
                item.max_stack_size, item.rarity, item.is_enchantable as i32,
                item.durability, item.attack_damage, item.texture_path,
                item.has_glint as i32, item.is_fire_resistant as i32,
                item.food_eat_seconds, item.food_always_eat as i32,
                item.food_eat_fast as i32, item.food_effects_json,
                item.tool_kind, item.tool_tier,
                item.armor_material, item.armor_slot,
                item.armor_defense, item.armor_toughness, item.knockback_resistance,
                item.attribute_modifiers_json, item.tags_json, item.custom_nbt_json,
                item.tooltip_lines_json,
                item.uses_remaining, item.cooldown_ticks, item.burn_time_ticks,
                item.repair_ingredient, item.recipe_remainder,
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_item(&self, id: i64) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_item(&self, id: i64) -> Result<Option<Item>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, item_name, display_name, namespace, max_stack_size, rarity,
                    is_enchantable, durability, attack_damage, texture_path,
                    has_glint, is_fire_resistant, food_eat_seconds, food_always_eat,
                    food_eat_fast, food_effects_json, tool_kind, tool_tier,
                    armor_material, armor_slot, armor_defense, armor_toughness, knockback_resistance,
                    attribute_modifiers_json, tags_json, custom_nbt_json, tooltip_lines_json,
                    uses_remaining, cooldown_ticks, burn_time_ticks,
                    repair_ingredient, recipe_remainder
             FROM items WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| Ok(Item::from_full_row(row)?));

        match result {
            Ok(i) => Ok(Some(i)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    pub fn get_items(&self, project_id: i64) -> Result<Vec<Item>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, item_name, display_name, namespace, max_stack_size, rarity,
                    is_enchantable, durability, attack_damage, texture_path,
                    has_glint, is_fire_resistant, food_eat_seconds, food_always_eat,
                    food_eat_fast, food_effects_json, tool_kind, tool_tier,
                    armor_material, armor_slot, armor_defense, armor_toughness, knockback_resistance,
                    attribute_modifiers_json, tags_json, custom_nbt_json, tooltip_lines_json,
                    uses_remaining, cooldown_ticks, burn_time_ticks,
                    repair_ingredient, recipe_remainder
             FROM items WHERE project_id = ?1 ORDER BY display_name"
        )?;

        let items = stmt.query_map(params![project_id], |row| Ok(Item::from_full_row(row)?))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    // ===== Visual Graph CRUD =====

    pub fn save_visual_graph(&self, graph: &VisualGraph) -> Result<i64, DbError> {
        let conn = self.connection()?;

        if let Some(id) = graph.id {
            conn.execute(
                "UPDATE visual_nodes_data SET graph_name = ?1, nodes_json = ?2, edges_json = ?3, viewport_json = ?4, updated_at = datetime('now')
                 WHERE id = ?5",
                params![graph.graph_name, graph.nodes_json, graph.edges_json, graph.viewport_json, id],
            )?;
            Ok(id)
        } else {
            conn.execute(
                "INSERT INTO visual_nodes_data (project_id, graph_name, graph_type, nodes_json, edges_json, viewport_json, is_active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    graph.project_id,
                    graph.graph_name,
                    graph.graph_type,
                    graph.nodes_json,
                    graph.edges_json,
                    graph.viewport_json,
                    graph.is_active as i32,
                ],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }

    pub fn get_visual_graph(&self, id: i64) -> Result<Option<VisualGraph>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, graph_name, graph_type, nodes_json, edges_json, viewport_json, is_active
             FROM visual_nodes_data WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(VisualGraph {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                graph_name: row.get(2)?,
                graph_type: row.get(3)?,
                nodes_json: row.get(4)?,
                edges_json: row.get(5)?,
                viewport_json: row.get(6)?,
                is_active: row.get::<_, i32>(7)? != 0,
            })
        });

        match result {
            Ok(g) => Ok(Some(g)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    pub fn get_visual_graphs(&self, project_id: i64) -> Result<Vec<VisualGraph>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, graph_name, graph_type, nodes_json, edges_json, viewport_json, is_active
             FROM visual_nodes_data WHERE project_id = ?1 AND is_active = 1 ORDER BY graph_name"
        )?;

        let graphs = stmt.query_map(params![project_id], |row| {
            Ok(VisualGraph {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                graph_name: row.get(2)?,
                graph_type: row.get(3)?,
                nodes_json: row.get(4)?,
                edges_json: row.get(5)?,
                viewport_json: row.get(6)?,
                is_active: row.get::<_, i32>(7)? != 0,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(graphs)
    }

    // ===== File Registry =====

    pub fn upsert_file(&self, entry: &FileEntry) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            "INSERT INTO file_registry (project_id, file_path, file_type, file_size, last_modified)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(project_id, file_path) DO UPDATE SET
                file_type = excluded.file_type,
                file_size = excluded.file_size,
                last_modified = excluded.last_modified",
            params![
                entry.project_id,
                entry.file_path,
                entry.file_type,
                entry.file_size,
                entry.last_modified,
            ],
        )?;
        Ok(())
    }

    pub fn remove_file(&self, project_id: i64, file_path: &str) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            "DELETE FROM file_registry WHERE project_id = ?1 AND file_path = ?2",
            params![project_id, file_path],
        )?;
        Ok(())
    }

    pub fn get_files(&self, project_id: i64) -> Result<Vec<FileEntry>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, file_path, file_type, file_size, last_modified
             FROM file_registry WHERE project_id = ?1 ORDER BY file_path"
        )?;

        let files = stmt.query_map(params![project_id], |row| {
            Ok(FileEntry {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                file_path: row.get(2)?,
                file_type: row.get(3)?,
                file_size: row.get(4)?,
                last_modified: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }

    // ===== Build Logs =====

    pub fn create_build_log(
        &self,
        project_id: i64,
        status: &str,
        log_content: &str,
        error_summary: Option<&str>,
        warnings_count: i32,
        errors_count: i32,
        build_time_ms: i64,
    ) -> Result<i64, DbError> {
        let conn = self.connection()?;

        // Determine next build_number
        let build_number: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(build_number), 0) + 1 FROM build_logs WHERE project_id = ?1",
                params![project_id],
                |row| row.get(0),
            )
            .unwrap_or(1);

        conn.execute(
            "INSERT INTO build_logs (project_id, build_number, status, log_content, error_summary, warnings_count, errors_count, build_time_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                project_id,
                build_number,
                status,
                log_content,
                error_summary,
                warnings_count,
                errors_count,
                build_time_ms,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }
}


// ============================================================================
// Recipe operations
// ============================================================================
//
// The recipes table predates the canonical RecipeEditor type, and the editor
// itself uses a JSON-shaped local type that differs from `src/types::Recipe`.
// To keep persistence working without forcing an immediate editor refactor,
// we store the editor's payload in two existing JSON columns:
//
//   * `pattern_json`     — `grid: string[][]` for shaped, or null
//   * `ingredients_json` — full `Ingredient[]` list
//
// The Java/JSON codegen reads these back, so the round-trip is lossless.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recipe {
    pub id: Option<i64>,
    pub project_id: i64,
    pub recipe_name: String,
    pub recipe_type: String,
    pub output_item_id: Option<i64>,
    pub output_block_id: Option<i64>,
    pub output_count: i32,
    pub cook_time: Option<i32>,
    pub experience: f64,
    pub pattern_json: Option<String>,
    pub ingredients_json: String,
}

impl Database {
    pub fn create_recipe(&self, recipe: &Recipe) -> Result<i64, DbError> {
        let conn = self.connection()?;
        conn.execute(
            "INSERT INTO recipes (project_id, recipe_name, recipe_type, output_item_id, output_block_id, output_count, cook_time, experience, pattern_json, ingredients_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                recipe.project_id,
                recipe.recipe_name,
                recipe.recipe_type,
                recipe.output_item_id,
                recipe.output_block_id,
                recipe.output_count,
                recipe.cook_time,
                recipe.experience,
                recipe.pattern_json,
                recipe.ingredients_json,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_recipe(&self, recipe: &Recipe) -> Result<(), DbError> {
        let id = recipe.id.ok_or_else(|| {
            DbError::Sqlite(rusqlite::Error::InvalidParameterName(
                "recipe.id is required for update".to_string(),
            ))
        })?;
        let conn = self.connection()?;
        conn.execute(
            "UPDATE recipes SET
                recipe_name = ?1,
                recipe_type = ?2,
                output_item_id = ?3,
                output_block_id = ?4,
                output_count = ?5,
                cook_time = ?6,
                experience = ?7,
                pattern_json = ?8,
                ingredients_json = ?9,
                updated_at = datetime('now')
             WHERE id = ?10",
            params![
                recipe.recipe_name,
                recipe.recipe_type,
                recipe.output_item_id,
                recipe.output_block_id,
                recipe.output_count,
                recipe.cook_time,
                recipe.experience,
                recipe.pattern_json,
                recipe.ingredients_json,
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_recipe(&self, id: i64) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute("DELETE FROM recipes WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_recipe(&self, id: i64) -> Result<Option<Recipe>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, recipe_name, recipe_type, output_item_id, output_block_id, output_count, cook_time, experience, pattern_json, ingredients_json
             FROM recipes WHERE id = ?1"
        )?;
        let result = stmt.query_row(params![id], |row| {
            Ok(Recipe {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                recipe_name: row.get(2)?,
                recipe_type: row.get(3)?,
                output_item_id: row.get(4)?,
                output_block_id: row.get(5)?,
                output_count: row.get(6)?,
                cook_time: row.get(7)?,
                experience: row.get(8)?,
                pattern_json: row.get(9)?,
                ingredients_json: row.get(10)?,
            })
        });
        match result {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    pub fn get_recipes(&self, project_id: i64) -> Result<Vec<Recipe>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, recipe_name, recipe_type, output_item_id, output_block_id, output_count, cook_time, experience, pattern_json, ingredients_json
             FROM recipes WHERE project_id = ?1 ORDER BY recipe_name"
        )?;
        let recipes = stmt.query_map(params![project_id], |row| {
            Ok(Recipe {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                recipe_name: row.get(2)?,
                recipe_type: row.get(3)?,
                output_item_id: row.get(4)?,
                output_block_id: row.get(5)?,
                output_count: row.get(6)?,
                cook_time: row.get(7)?,
                experience: row.get(8)?,
                pattern_json: row.get(9)?,
                ingredients_json: row.get(10)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(recipes)
    }
}



// ============================================================================
// Generic asset registry
// ============================================================================
//
// The legacy editors (Entity, Biome, Dimension, Advancement, …) each use
// their own local TypeScript shape. Refactoring all of them onto canonical
// types is out of scope for the immediate persistence work; instead we
// persist their payloads as opaque JSON via the `registry` table that is
// already in the schema. Every row carries:
//
//   * `asset_type`  — discriminator like "entity" / "biome"
//   * `asset_name`  — registry id used in JSON / Java codegen
//   * `namespace`   — usually the project's modid
//   * `metadata`    — full editor payload as a JSON string
//
// Per-feature generators live in `commands::asset_codegen_commands` and
// know how to parse the metadata for their asset_type.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegistryAsset {
    pub id: Option<i64>,
    pub project_id: i64,
    pub asset_type: String,
    pub asset_name: String,
    pub namespace: String,
    pub display_name: Option<String>,
    pub file_path: Option<String>,
    pub metadata: Option<String>,
}

impl Database {
    pub fn upsert_asset(&self, asset: &RegistryAsset) -> Result<i64, DbError> {
        let conn = self.connection()?;
        if let Some(id) = asset.id {
            conn.execute(
                "UPDATE registry SET
                    asset_type = ?1,
                    asset_name = ?2,
                    namespace = ?3,
                    display_name = ?4,
                    file_path = ?5,
                    metadata = ?6,
                    updated_at = datetime('now')
                 WHERE id = ?7",
                params![
                    asset.asset_type,
                    asset.asset_name,
                    asset.namespace,
                    asset.display_name,
                    asset.file_path,
                    asset.metadata,
                    id,
                ],
            )?;
            Ok(id)
        } else {
            conn.execute(
                "INSERT INTO registry (project_id, asset_type, asset_name, namespace, display_name, file_path, metadata)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    asset.project_id,
                    asset.asset_type,
                    asset.asset_name,
                    asset.namespace,
                    asset.display_name,
                    asset.file_path,
                    asset.metadata,
                ],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }

    pub fn delete_asset(&self, id: i64) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute("DELETE FROM registry WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_asset(&self, id: i64) -> Result<Option<RegistryAsset>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, asset_type, asset_name, namespace, display_name, file_path, metadata
             FROM registry WHERE id = ?1"
        )?;
        let result = stmt.query_row(params![id], |row| {
            Ok(RegistryAsset {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                asset_type: row.get(2)?,
                asset_name: row.get(3)?,
                namespace: row.get(4)?,
                display_name: row.get(5)?,
                file_path: row.get(6)?,
                metadata: row.get(7)?,
            })
        });
        match result {
            Ok(a) => Ok(Some(a)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    pub fn get_assets(&self, project_id: i64, asset_type: &str) -> Result<Vec<RegistryAsset>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, asset_type, asset_name, namespace, display_name, file_path, metadata
             FROM registry WHERE project_id = ?1 AND asset_type = ?2 ORDER BY asset_name"
        )?;
        let assets = stmt.query_map(params![project_id, asset_type], |row| {
            Ok(RegistryAsset {
                id: Some(row.get(0)?),
                project_id: row.get(1)?,
                asset_type: row.get(2)?,
                asset_name: row.get(3)?,
                namespace: row.get(4)?,
                display_name: row.get(5)?,
                file_path: row.get(6)?,
                metadata: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(assets)
    }
}
