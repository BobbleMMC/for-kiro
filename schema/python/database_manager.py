"""
Database Manager for Minecraft Mod Generator
Handles database initialization, migrations, and operations
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path
import json


class DatabaseManager:
    """SQLite Database manager with migration and initialization"""

    def __init__(self, db_path: str = "mod_generator.db"):
        """Initialize database manager"""
        self.db_path = db_path
        self.connection: Optional[sqlite3.Connection] = None
        self._schema_sql = self._load_schema()

    def _load_schema(self) -> str:
        """Load schema from SQL file"""
        schema_file = Path(__file__).parent / "minecraft_mod_schema.sql"
        if schema_file.exists():
            with open(schema_file, 'r', encoding='utf-8') as f:
                return f.read()
        return ""

    def connect(self) -> sqlite3.Connection:
        """Connect to database"""
        if self.connection is None:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row
            # Enable foreign keys
            self.connection.execute("PRAGMA foreign_keys = ON")
        return self.connection

    def disconnect(self):
        """Disconnect from database"""
        if self.connection:
            self.connection.close()
            self.connection = None

    def initialize_database(self) -> bool:
        """Initialize database with complete schema"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Split and execute schema statements
            statements = self._schema_sql.split(';')
            for statement in statements:
                statement = statement.strip()
                if statement:
                    cursor.execute(statement)

            conn.commit()
            print("✓ Database initialized successfully")
            return True
        except sqlite3.Error as e:
            print(f"✗ Database initialization error: {e}")
            return False

    def drop_all_tables(self) -> bool:
        """Drop all tables (for testing)"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get all table names
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = cursor.fetchall()

            # Drop all tables
            cursor.execute("PRAGMA foreign_keys = OFF")
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table[0]}")
            cursor.execute("PRAGMA foreign_keys = ON")

            conn.commit()
            print(f"✓ Dropped {len(tables)} tables")
            return True
        except sqlite3.Error as e:
            print(f"✗ Error dropping tables: {e}")
            return False

    def backup_database(self, backup_path: Optional[str] = None) -> bool:
        """Backup database"""
        try:
            if backup_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = f"mod_generator_backup_{timestamp}.db"

            conn = self.connect()
            backup_conn = sqlite3.connect(backup_path)

            with backup_conn:
                conn.backup(backup_conn)

            backup_conn.close()
            print(f"✓ Database backed up to {backup_path}")
            return True
        except sqlite3.Error as e:
            print(f"✗ Backup error: {e}")
            return False

    # ============================================================
    # PROJECT OPERATIONS
    # ============================================================

    def create_project(
        self,
        name: str,
        minecraft_version: str,
        mod_loader: str,
        mod_version: str,
        author: str,
        namespace: str,
        description: Optional[str] = None
    ) -> Optional[int]:
        """Create a new project"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO projects 
                (name, description, minecraft_version, mod_loader, mod_version, author, namespace)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, description, minecraft_version, mod_loader, mod_version, author, namespace))

            conn.commit()
            project_id = cursor.lastrowid

            # Create project settings
            cursor.execute("""
                INSERT INTO project_settings (project_id)
                VALUES (?)
            """, (project_id,))
            conn.commit()

            print(f"✓ Project created: {name} (ID: {project_id})")
            return project_id
        except sqlite3.Error as e:
            print(f"✗ Error creating project: {e}")
            return None

    def get_project(self, project_id: int) -> Optional[Dict]:
        """Get project by ID"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()

            if row:
                return dict(row)
            return None
        except sqlite3.Error as e:
            print(f"✗ Error getting project: {e}")
            return None

    def get_all_projects(self) -> List[Dict]:
        """Get all projects"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM v_project_overview ORDER BY created_at DESC")
            rows = cursor.fetchall()

            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"✗ Error getting projects: {e}")
            return []

    # ============================================================
    # BLOCK OPERATIONS
    # ============================================================

    def create_block(self, project_id: int, block_data: Dict[str, Any]) -> Optional[int]:
        """Create a new block"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO blocks 
                (project_id, block_name, display_name, namespace, hardness, resistance, 
                 slipperiness, speed_factor, friction_factor, luminance, is_replaceable, 
                 is_solid, has_collision, is_full_block, has_gravity, is_flammable, 
                 flammability_level, fire_spreadability, can_be_hydrated, texture_top, 
                 texture_bottom, texture_side, texture_all, custom_model_data, material_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                block_data.get('block_name'),
                block_data.get('display_name'),
                block_data.get('namespace'),
                block_data.get('hardness', 1.5),
                block_data.get('resistance', 6.0),
                block_data.get('slipperiness', 0.6),
                block_data.get('speed_factor', 1.0),
                block_data.get('friction_factor', 0.4),
                block_data.get('luminance', 0),
                block_data.get('is_replaceable', False),
                block_data.get('is_solid', True),
                block_data.get('has_collision', True),
                block_data.get('is_full_block', True),
                block_data.get('has_gravity', False),
                block_data.get('is_flammable', False),
                block_data.get('flammability_level', 0),
                block_data.get('fire_spreadability', 0),
                block_data.get('can_be_hydrated', False),
                block_data.get('texture_top'),
                block_data.get('texture_bottom'),
                block_data.get('texture_side'),
                block_data.get('texture_all'),
                block_data.get('custom_model_data'),
                block_data.get('material_type', 'stone')
            ))

            conn.commit()
            block_id = cursor.lastrowid
            print(f"✓ Block created: {block_data.get('block_name')} (ID: {block_id})")
            return block_id
        except sqlite3.Error as e:
            print(f"✗ Error creating block: {e}")
            return None

    def get_project_blocks(self, project_id: int) -> List[Dict]:
        """Get all blocks for a project"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM v_blocks_detailed WHERE project_id = ? ORDER BY created_at DESC",
                (project_id,)
            )
            rows = cursor.fetchall()

            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"✗ Error getting blocks: {e}")
            return []

    # ============================================================
    # ITEM OPERATIONS
    # ============================================================

    def create_item(self, project_id: int, item_data: Dict[str, Any]) -> Optional[int]:
        """Create a new item"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO items 
                (project_id, item_name, display_name, namespace, max_stack_size, rarity,
                 is_enchantable, is_consumable, food_nutrition, food_saturation, is_weapon,
                 is_armor, is_tool, durability, attack_damage, attack_speed, texture_path,
                 custom_model_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id,
                item_data.get('item_name'),
                item_data.get('display_name'),
                item_data.get('namespace'),
                item_data.get('max_stack_size', 64),
                item_data.get('rarity', 'common'),
                item_data.get('is_enchantable', True),
                item_data.get('is_consumable', False),
                item_data.get('food_nutrition'),
                item_data.get('food_saturation'),
                item_data.get('is_weapon', False),
                item_data.get('is_armor', False),
                item_data.get('is_tool', False),
                item_data.get('durability'),
                item_data.get('attack_damage'),
                item_data.get('attack_speed', 4.0),
                item_data.get('texture_path'),
                item_data.get('custom_model_data')
            ))

            conn.commit()
            item_id = cursor.lastrowid
            print(f"✓ Item created: {item_data.get('item_name')} (ID: {item_id})")
            return item_id
        except sqlite3.Error as e:
            print(f"✗ Error creating item: {e}")
            return None

    def get_project_items(self, project_id: int) -> List[Dict]:
        """Get all items for a project"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM v_items_with_recipes WHERE project_id = ? ORDER BY created_at DESC",
                (project_id,)
            )
            rows = cursor.fetchall()

            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"✗ Error getting items: {e}")
            return []

    # ============================================================
    # RECIPE OPERATIONS
    # ============================================================

    def create_recipe(
        self,
        project_id: int,
        recipe_name: str,
        recipe_type: str,
        output_item_id: Optional[int] = None,
        output_block_id: Optional[int] = None,
        output_count: int = 1,
        cook_time: Optional[int] = None,
        experience: float = 0.0
    ) -> Optional[int]:
        """Create a new recipe"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO recipes
                (project_id, recipe_name, output_item_id, output_block_id, output_count,
                 recipe_type, cook_time, experience)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id, recipe_name, output_item_id, output_block_id, output_count,
                recipe_type, cook_time, experience
            ))

            conn.commit()
            recipe_id = cursor.lastrowid
            print(f"✓ Recipe created: {recipe_name} (ID: {recipe_id})")
            return recipe_id
        except sqlite3.Error as e:
            print(f"✗ Error creating recipe: {e}")
            return None

    def add_recipe_ingredient(
        self,
        recipe_id: int,
        item_id: Optional[int] = None,
        block_id: Optional[int] = None,
        tag_name: Optional[str] = None,
        count: int = 1,
        position: int = 0
    ) -> bool:
        """Add ingredient to recipe"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO recipe_ingredients
                (recipe_id, item_id, block_id, tag_name, count, position)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (recipe_id, item_id, block_id, tag_name, count, position))

            conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"✗ Error adding ingredient: {e}")
            return False

    # ============================================================
    # BUILD LOG OPERATIONS
    # ============================================================

    def create_build_log(
        self,
        project_id: int,
        build_number: int,
        status: str,
        log_content: str,
        errors_count: int = 0,
        warnings_count: int = 0,
        build_time_ms: Optional[int] = None,
        error_summary: Optional[str] = None
    ) -> Optional[int]:
        """Create a build log"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO build_logs
                (project_id, build_number, status, log_content, error_summary,
                 warnings_count, errors_count, build_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id, build_number, status, log_content, error_summary,
                warnings_count, errors_count, build_time_ms
            ))

            conn.commit()
            log_id = cursor.lastrowid
            print(f"✓ Build log created: Build #{build_number} - {status.upper()}")
            return log_id
        except sqlite3.Error as e:
            print(f"✗ Error creating build log: {e}")
            return None

    def get_project_builds(self, project_id: int, limit: int = 20) -> List[Dict]:
        """Get recent builds for a project"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT * FROM v_recent_builds
                WHERE project_id = ?
                LIMIT ?
            """, (project_id, limit))
            rows = cursor.fetchall()

            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"✗ Error getting builds: {e}")
            return []

    # ============================================================
    # AGENT TASK OPERATIONS
    # ============================================================

    def create_agent_task(
        self,
        project_id: int,
        task_type: str,
        agent_type: str,
        input_data: str
    ) -> Optional[int]:
        """Create an agent task"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO agent_tasks
                (project_id, task_type, agent_type, input_data, status)
                VALUES (?, ?, ?, ?, 'pending')
            """, (project_id, task_type, agent_type, input_data))

            conn.commit()
            task_id = cursor.lastrowid
            print(f"✓ Agent task created: {agent_type} - {task_type} (ID: {task_id})")
            return task_id
        except sqlite3.Error as e:
            print(f"✗ Error creating agent task: {e}")
            return None

    def update_agent_task(
        self,
        task_id: int,
        status: str,
        output_data: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """Update agent task status"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            if status == 'completed':
                cursor.execute("""
                    UPDATE agent_tasks
                    SET status = ?, output_data = ?, completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (status, output_data, task_id))
            elif status == 'failed':
                cursor.execute("""
                    UPDATE agent_tasks
                    SET status = ?, error_message = ?, retry_count = retry_count + 1, completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (status, error_message, task_id))
            else:
                cursor.execute("""
                    UPDATE agent_tasks
                    SET status = ?, started_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (status, task_id))

            conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"✗ Error updating task: {e}")
            return False

    def get_pending_tasks(self, agent_type: Optional[str] = None) -> List[Dict]:
        """Get pending agent tasks"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            if agent_type:
                cursor.execute("""
                    SELECT * FROM agent_tasks
                    WHERE status = 'pending' AND agent_type = ?
                    ORDER BY created_at ASC
                """, (agent_type,))
            else:
                cursor.execute("""
                    SELECT * FROM agent_tasks
                    WHERE status = 'pending'
                    ORDER BY created_at ASC
                """)

            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"✗ Error getting tasks: {e}")
            return []

    # ============================================================
    # STATISTICS & REPORTING
    # ============================================================

    def get_project_statistics(self, project_id: int) -> Dict[str, Any]:
        """Get comprehensive project statistics"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get overview
            cursor.execute(
                "SELECT * FROM v_project_overview WHERE id = ?",
                (project_id,)
            )
            overview = dict(cursor.fetchone())

            # Get task status
            cursor.execute("""
                SELECT * FROM v_agent_task_status WHERE project_id = ?
            """, (project_id,))
            task_status = [dict(row) for row in cursor.fetchall()]

            # Get build statistics
            cursor.execute("""
                SELECT
                    COUNT(*) as total_builds,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_builds,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_builds,
                    AVG(build_time_ms) as avg_build_time
                FROM build_logs
                WHERE project_id = ?
            """, (project_id,))
            build_stats = dict(cursor.fetchone())

            return {
                'overview': overview,
                'task_status': task_status,
                'build_stats': build_stats
            }
        except sqlite3.Error as e:
            print(f"✗ Error getting statistics: {e}")
            return {}

    def export_project_to_json(self, project_id: int) -> Optional[str]:
        """Export complete project to JSON"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get project data
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            project = dict(cursor.fetchone())

            # Get all related data
            cursor.execute("SELECT * FROM blocks WHERE project_id = ?", (project_id,))
            blocks = [dict(row) for row in cursor.fetchall()]

            cursor.execute("SELECT * FROM items WHERE project_id = ?", (project_id,))
            items = [dict(row) for row in cursor.fetchall()]

            cursor.execute("SELECT * FROM recipes WHERE project_id = ?", (project_id,))
            recipes = [dict(row) for row in cursor.fetchall()]

            export_data = {
                'project': project,
                'blocks': blocks,
                'items': items,
                'recipes': recipes,
                'export_date': datetime.now().isoformat()
            }

            json_str = json.dumps(export_data, indent=2, default=str)
            print(f"✓ Project exported to JSON")
            return json_str
        except sqlite3.Error as e:
            print(f"✗ Error exporting project: {e}")
            return None


# ============================================================
# EXAMPLE USAGE
# ============================================================

if __name__ == "__main__":
    # Initialize manager
    db = DatabaseManager()

    # Initialize database
    print("\n1. Initializing database...")
    db.initialize_database()

    # Create a project
    print("\n2. Creating project...")
    project_id = db.create_project(
        name="MyAwesomeMod",
        minecraft_version="1.20.1",
        mod_loader="fabric",
        mod_version="1.0.0",
        author="MyName",
        namespace="mymod",
        description="My first awesome mod!"
    )

    # Create blocks
    print("\n3. Creating blocks...")
    block_id_1 = db.create_block(project_id, {
        'block_name': 'custom_ore',
        'display_name': 'Custom Ore',
        'namespace': 'mymod',
        'hardness': 3.0,
        'resistance': 9.0,
        'material_type': 'ore',
        'luminance': 0
    })

    block_id_2 = db.create_block(project_id, {
        'block_name': 'custom_block',
        'display_name': 'Custom Block',
        'namespace': 'mymod',
        'hardness': 2.0,
        'resistance': 6.0,
        'material_type': 'decorative',
        'luminance': 15
    })

    # Create items
    print("\n4. Creating items...")
    item_id_1 = db.create_item(project_id, {
        'item_name': 'custom_ingot',
        'display_name': 'Custom Ingot',
        'namespace': 'mymod',
        'rarity': 'rare',
        'max_stack_size': 64
    })

    item_id_2 = db.create_item(project_id, {
        'item_name': 'custom_sword',
        'display_name': 'Custom Sword',
        'namespace': 'mymod',
        'is_weapon': True,
        'attack_damage': 7.0,
        'durability': 500,
        'max_stack_size': 1
    })

    # Create recipe
    print("\n5. Creating recipes...")
    recipe_id = db.create_recipe(
        project_id,
        recipe_name="custom_ingot_crafting",
        recipe_type="smelting",
        output_item_id=item_id_1,
        output_count=1,
        cook_time=200,
        experience=0.7
    )

    db.add_recipe_ingredient(recipe_id, block_id=block_id_1)

    # Create build log
    print("\n6. Creating build log...")
    db.create_build_log(
        project_id,
        build_number=1,
        status="success",
        log_content="Build completed successfully",
        errors_count=0,
        warnings_count=0,
        build_time_ms=5230
    )

    # Create agent task
    print("\n7. Creating agent task...")
    task_id = db.create_agent_task(
        project_id,
        task_type="code_generation",
        agent_type="logic",
        input_data='{"item_name": "custom_sword"}'
    )

    db.update_agent_task(task_id, "completed", output_data="public class CustomSwordItem extends SwordItem {...}")

    # Get project statistics
    print("\n8. Project statistics:")
    stats = db.get_project_statistics(project_id)
    print(json.dumps(stats, indent=2, default=str))

    # Get all projects
    print("\n9. All projects:")
    projects = db.get_all_projects()
    for proj in projects:
        print(f"  - {proj['name']} ({proj['namespace']}) - {proj['block_count']} blocks, {proj['item_count']} items")

    # Export to JSON
    print("\n10. Exporting project...")
    json_export = db.export_project_to_json(project_id)
    if json_export:
        with open("project_export.json", "w") as f:
            f.write(json_export)
        print("✓ Exported to project_export.json")

    # Disconnect
    db.disconnect()
    print("\n✓ Database operations completed!")
