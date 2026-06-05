# Minecraft Mod Generator - Database Schema

Complete database schema and entity models for the Minecraft Mod Generator desktop application.

## 📋 Directory Structure

```
schema/
├── database/
│   └── minecraft_mod_schema.sql       # Complete SQLite schema
├── python/
│   ├── entity_models.py               # Python ORM-style entity models
│   └── database_manager.py            # Database manager with operations
├── documentation/
│   ├── schema_er_diagram.html         # ER diagram and relationships
│   └── README.md                      # This file
```

## 🗄️ Database Schema Overview

### Core Components

1. **Projects** - Mod project container
   - minecraft_version, mod_loader (fabric/forge/neoforge)
   - build tracking, version management

2. **Content Tables**
   - **Blocks** - Block definitions with properties
   - **Items** - Item definitions with attributes
   - **Enchantments** - Custom enchantments
   - **Recipes** - Crafting recipes
   - **Armor Types** - Armor sets with pieces
   - **Tool Types** - Tool definitions

3. **World Tables**
   - **Entity Types** - Custom mobs/entities
   - **Biomes** - Custom biomes
   - **Dimensions** - Custom dimensions

4. **System Tables**
   - **Agent Tasks** - AI agent task tracking
   - **Build Logs** - Build history and diagnostics
   - **Project Dependencies** - Gradle dependencies
   - **Project Settings** - Configuration
   - **File Versions** - Version control

## 📊 Database Statistics

- **17** Main Tables
- **5** Database Views
- **6** Auto Triggers
- **50+** Relationships
- **Full 3NF normalization**

## 🚀 Quick Start

### Initialize Database

```python
from schema.python.database_manager import DatabaseManager

db = DatabaseManager("mod_generator.db")
db.initialize_database()
```

### Create a Project

```python
project_id = db.create_project(
    name="MyAwesomeMod",
    minecraft_version="1.20.1",
    mod_loader="fabric",
    mod_version="1.0.0",
    author="YourName",
    namespace="mymod"
)
```

### Add Blocks and Items

```python
# Create a block
block_id = db.create_block(project_id, {
    'block_name': 'custom_ore',
    'display_name': 'Custom Ore',
    'namespace': 'mymod',
    'hardness': 3.0,
    'resistance': 9.0,
    'material_type': 'ore'
})

# Create an item
item_id = db.create_item(project_id, {
    'item_name': 'custom_ingot',
    'display_name': 'Custom Ingot',
    'namespace': 'mymod',
    'rarity': 'rare'
})
```

### Create Recipes

```python
recipe_id = db.create_recipe(
    project_id,
    recipe_name="custom_ingot_smelting",
    recipe_type="smelting",
    output_item_id=item_id,
    cook_time=200,
    experience=0.7
)

# Add ingredients
db.add_recipe_ingredient(recipe_id, block_id=block_id)
```

### Track Agent Tasks

```python
task_id = db.create_agent_task(
    project_id,
    task_type="code_generation",
    agent_type="logic",
    input_data='{"item_name": "custom_sword"}'
)

# Update when done
db.update_agent_task(
    task_id,
    "completed",
    output_data="// Generated Java code here"
)
```

## 📐 Entity Relationships

### Main Relationships

1. **Projects → Content**
   - 1-to-Many: Projects contain Blocks, Items, Enchantments, Recipes

2. **Recipes → Ingredients**
   - 1-to-Many: Recipes have multiple ingredients
   - Many-to-Many via recipe_ingredients table

3. **Armor/Tools → Items**
   - Each armor set has 4 items (helmet, chest, legs, boots)
   - Each tool references its item

4. **Entities → Drops**
   - 1-to-Many: Entities have multiple drop items

5. **Projects → Builds**
   - 1-to-Many: Projects have multiple build logs

6. **Projects → Agent Tasks**
   - 1-to-Many: Track AI agent activities

## 🔍 Available Views

### v_project_overview
Complete project summary with content statistics
```sql
SELECT * FROM v_project_overview WHERE name = 'MyAwesomeMod';
```

### v_blocks_detailed
All blocks with project information
```sql
SELECT * FROM v_blocks_detailed WHERE project_id = 1;
```

### v_items_with_recipes
Items with recipe usage count
```sql
SELECT * FROM v_items_with_recipes WHERE project_id = 1;
```

### v_recent_builds
Recent build history
```sql
SELECT * FROM v_recent_builds LIMIT 20;
```

### v_agent_task_status
Agent task execution summary
```sql
SELECT * FROM v_agent_task_status WHERE project_id = 1;
```

## 🔐 Data Integrity Features

- **Foreign Key Constraints** - Cascading deletes, referential integrity
- **Unique Constraints** - Prevent duplicates on critical fields
- **Check Constraints** - Enum validation
- **Auto Timestamps** - created_at, updated_at auto-managed
- **Auto Triggers** - Build count increment, last_build tracking

## ⚡ Performance Optimizations

- **Indexed Columns**
  - project_id (all related tables)
  - namespace (blocks, items, etc.)
  - status (build_logs, agent_tasks)
  - recipe_type (recipes)

- **Composite Indexes** - Foreign key + namespace combinations

- **Query Optimization** - Pre-built views for common queries

## 📝 Entity Models (Python)

All entity models include:
- Dataclass definitions with type hints
- Enum values for validation
- Helper methods (to_dict, get_registry_name, etc.)
- Relationship mapping

Example:
```python
from schema.python.entity_models import Block, Item, Recipe

block = Block(
    project_id=1,
    block_name="custom_ore",
    hardness=3.0,
    material_type=MaterialType.ORE
)

print(block.get_block_registry_name())  # mymod:custom_ore
```

## 🛠️ Database Manager Operations

### Project Operations
- `create_project()` - Create new project
- `get_project()` - Get project by ID
- `get_all_projects()` - List all projects
- `get_project_statistics()` - Comprehensive statistics

### Content Operations
- `create_block()` - Add block
- `create_item()` - Add item
- `create_recipe()` - Add recipe
- `add_recipe_ingredient()` - Add recipe ingredient

### Build Operations
- `create_build_log()` - Log build execution
- `get_project_builds()` - Get build history

### Agent Operations
- `create_agent_task()` - Create task for agent
- `update_agent_task()` - Update task status
- `get_pending_tasks()` - Get tasks awaiting execution

### Utilities
- `initialize_database()` - Create tables
- `backup_database()` - Create backup
- `export_project_to_json()` - Export project data
- `drop_all_tables()` - Clear database (testing)

## 📚 SQL Examples

### List all blocks in project
```sql
SELECT * FROM v_blocks_detailed WHERE project_id = 1;
```

### Find recipes using an item
```sql
SELECT r.* FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE ri.item_id = 5;
```

### Get build statistics
```sql
SELECT
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_builds,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_builds,
    AVG(build_time_ms) as avg_build_time
FROM build_logs
WHERE project_id = 1;
```

### Track agent task completion
```sql
SELECT agent_type, status, COUNT(*) as count
FROM agent_tasks
WHERE project_id = 1
GROUP BY agent_type, status;
```

## 📖 Documentation

- `schema_er_diagram.html` - Visual ER diagram with interactive relationships
- Complete schema design with colors and legends
- Table descriptions and field information
- SQL query examples

Open in browser: `schema/documentation/schema_er_diagram.html`

## 🔄 Migration Guide

### Backup Before Migration
```python
db.backup_database("backup_before_migration.db")
```

### Upgrade Schema
1. Create new database with updated schema
2. Migrate existing data using SQL scripts
3. Verify data integrity
4. Backup old database

## 📋 TODO

- [ ] Add foreign key constraint tests
- [ ] Implement data validation rules
- [ ] Create migration scripts for schema updates
- [ ] Add audit logging table
- [ ] Implement soft deletes for projects
- [ ] Add permission/role management tables
- [ ] Create performance testing suite

## 📞 Support

For issues or questions about the schema:
1. Check the ER diagram for relationships
2. Review entity_models.py for field definitions
3. See database_manager.py for usage examples
4. Check SQL examples in this README

---

**Database Version:** 1.0  
**Last Updated:** 2024  
**SQLite Version:** 3.40+  
**Python Version:** 3.10+
