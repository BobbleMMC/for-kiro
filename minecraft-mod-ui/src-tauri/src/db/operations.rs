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
            "INSERT INTO items (project_id, item_name, display_name, namespace, max_stack_size, rarity, is_enchantable, durability, attack_damage, texture_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                item.project_id,
                item.item_name,
                item.display_name,
                item.namespace,
                item.max_stack_size,
                item.rarity,
                item.is_enchantable as i32,
                item.durability,
                item.attack_damage,
                item.texture_path,
            ],
        )?;
        Ok(conn.last_insert_rowid())
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
}
