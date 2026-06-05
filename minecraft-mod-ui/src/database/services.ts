/**
 * Database Service Layer
 * CRUD operations for all entities with IndexedDB via Dexie.js
 */

import { db } from './db';
import type {
  Project,
  Block,
  Item,
  Enchantment,
  Recipe,
  RecipeIngredient,
  EntityType,
  EntityDrop,
  BuildLog,
  AgentTask,
  ProjectStats,
} from '../types';

// ============================================================
// PROJECT SERVICES
// ============================================================

export const ProjectService = {
  async getAll(): Promise<Project[]> {
    return db.projects.toArray();
  },

  async getById(id: number): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  async create(project: Omit<Project, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return db.projects.add({
      ...project,
      created_at: now,
      updated_at: now,
    } as Project);
  },

  async update(id: number, changes: Partial<Project>): Promise<void> {
    await db.projects.update(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.transaction('rw', [
      db.projects, db.blocks, db.items, db.enchantments,
      db.recipes, db.recipeIngredients, db.entities, db.entityDrops,
      db.buildLogs, db.agentTasks,
    ], async () => {
      // Cascade delete all project content
      await db.blocks.where('project_id').equals(id).delete();
      await db.items.where('project_id').equals(id).delete();
      await db.enchantments.where('project_id').equals(id).delete();

      // Delete recipe ingredients for project recipes
      const recipeIds = await db.recipes.where('project_id').equals(id).primaryKeys();
      for (const recipeId of recipeIds) {
        await db.recipeIngredients.where('recipe_id').equals(recipeId).delete();
      }
      await db.recipes.where('project_id').equals(id).delete();

      // Delete entity drops for project entities
      const entityIds = await db.entities.where('project_id').equals(id).primaryKeys();
      for (const entityId of entityIds) {
        await db.entityDrops.where('entity_id').equals(entityId).delete();
      }
      await db.entities.where('project_id').equals(id).delete();

      await db.buildLogs.where('project_id').equals(id).delete();
      await db.agentTasks.where('project_id').equals(id).delete();
      await db.projects.delete(id);
    });
  },

  async getStats(projectId: number): Promise<ProjectStats> {
    const [block_count, item_count, enchantment_count, recipe_count, entity_count, build_count] =
      await Promise.all([
        db.blocks.where('project_id').equals(projectId).count(),
        db.items.where('project_id').equals(projectId).count(),
        db.enchantments.where('project_id').equals(projectId).count(),
        db.recipes.where('project_id').equals(projectId).count(),
        db.entities.where('project_id').equals(projectId).count(),
        db.buildLogs.where('project_id').equals(projectId).count(),
      ]);

    return { block_count, item_count, enchantment_count, recipe_count, entity_count, build_count };
  },

  async archive(id: number): Promise<void> {
    await db.projects.update(id, { is_archived: true, updated_at: new Date().toISOString() });
  },

  async unarchive(id: number): Promise<void> {
    await db.projects.update(id, { is_archived: false, updated_at: new Date().toISOString() });
  },
};

// ============================================================
// BLOCK SERVICES
// ============================================================

export const BlockService = {
  async getAll(projectId?: number): Promise<Block[]> {
    if (projectId) {
      return db.blocks.where('project_id').equals(projectId).toArray();
    }
    return db.blocks.toArray();
  },

  async getById(id: number): Promise<Block | undefined> {
    return db.blocks.get(id);
  },

  async create(block: Omit<Block, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return db.blocks.add({
      ...block,
      created_at: now,
      updated_at: now,
    } as Block);
  },

  async update(id: number, changes: Partial<Block>): Promise<void> {
    await db.blocks.update(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.blocks.delete(id);
  },

  async getByMaterial(projectId: number, materialType: string): Promise<Block[]> {
    return db.blocks
      .where('project_id').equals(projectId)
      .filter(b => b.material_type === materialType)
      .toArray();
  },

  async search(projectId: number, query: string): Promise<Block[]> {
    const lowerQuery = query.toLowerCase();
    return db.blocks
      .where('project_id').equals(projectId)
      .filter(b =>
        b.block_name.toLowerCase().includes(lowerQuery) ||
        b.display_name.toLowerCase().includes(lowerQuery)
      )
      .toArray();
  },
};

// ============================================================
// ITEM SERVICES
// ============================================================

export const ItemService = {
  async getAll(projectId?: number): Promise<Item[]> {
    if (projectId) {
      return db.items.where('project_id').equals(projectId).toArray();
    }
    return db.items.toArray();
  },

  async getById(id: number): Promise<Item | undefined> {
    return db.items.get(id);
  },

  async create(item: Omit<Item, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return db.items.add({
      ...item,
      created_at: now,
      updated_at: now,
    } as Item);
  },

  async update(id: number, changes: Partial<Item>): Promise<void> {
    await db.items.update(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.items.delete(id);
  },

  async getByRarity(projectId: number, rarity: string): Promise<Item[]> {
    return db.items
      .where('project_id').equals(projectId)
      .filter(i => i.rarity === rarity)
      .toArray();
  },

  async getWeapons(projectId: number): Promise<Item[]> {
    return db.items
      .where('project_id').equals(projectId)
      .filter(i => i.is_weapon)
      .toArray();
  },

  async getArmor(projectId: number): Promise<Item[]> {
    return db.items
      .where('project_id').equals(projectId)
      .filter(i => i.is_armor)
      .toArray();
  },

  async getTools(projectId: number): Promise<Item[]> {
    return db.items
      .where('project_id').equals(projectId)
      .filter(i => i.is_tool)
      .toArray();
  },

  async getConsumables(projectId: number): Promise<Item[]> {
    return db.items
      .where('project_id').equals(projectId)
      .filter(i => i.is_consumable)
      .toArray();
  },

  async search(projectId: number, query: string): Promise<Item[]> {
    const lowerQuery = query.toLowerCase();
    return db.items
      .where('project_id').equals(projectId)
      .filter(i =>
        i.item_name.toLowerCase().includes(lowerQuery) ||
        i.display_name.toLowerCase().includes(lowerQuery)
      )
      .toArray();
  },
};

// ============================================================
// ENCHANTMENT SERVICES
// ============================================================

export const EnchantmentService = {
  async getAll(projectId?: number): Promise<Enchantment[]> {
    if (projectId) {
      return db.enchantments.where('project_id').equals(projectId).toArray();
    }
    return db.enchantments.toArray();
  },

  async getById(id: number): Promise<Enchantment | undefined> {
    return db.enchantments.get(id);
  },

  async create(enchantment: Omit<Enchantment, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return db.enchantments.add({
      ...enchantment,
      created_at: now,
      updated_at: now,
    } as Enchantment);
  },

  async update(id: number, changes: Partial<Enchantment>): Promise<void> {
    await db.enchantments.update(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.enchantments.delete(id);
  },

  async getTreasures(projectId: number): Promise<Enchantment[]> {
    return db.enchantments
      .where('project_id').equals(projectId)
      .filter(e => e.is_treasure)
      .toArray();
  },

  async getCurses(projectId: number): Promise<Enchantment[]> {
    return db.enchantments
      .where('project_id').equals(projectId)
      .filter(e => e.is_curse)
      .toArray();
  },
};

// ============================================================
// RECIPE SERVICES
// ============================================================

export const RecipeService = {
  async getAll(projectId?: number): Promise<Recipe[]> {
    let recipes: Recipe[];
    if (projectId) {
      recipes = await db.recipes.where('project_id').equals(projectId).toArray();
    } else {
      recipes = await db.recipes.toArray();
    }

    // Load ingredients for each recipe
    for (const recipe of recipes) {
      recipe.ingredients = await db.recipeIngredients
        .where('recipe_id').equals(recipe.id)
        .toArray();
    }
    return recipes;
  },

  async getById(id: number): Promise<Recipe | undefined> {
    const recipe = await db.recipes.get(id);
    if (recipe) {
      recipe.ingredients = await db.recipeIngredients
        .where('recipe_id').equals(id)
        .toArray();
    }
    return recipe;
  },

  async create(recipe: Omit<Recipe, 'id'>, ingredients?: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]): Promise<number> {
    const now = new Date().toISOString();
    const recipeId = await db.recipes.add({
      ...recipe,
      ingredients: [],
      created_at: now,
      updated_at: now,
    } as unknown as Recipe);

    if (ingredients && ingredients.length > 0) {
      const ingredientsWithRecipeId = ingredients.map(ing => ({
        ...ing,
        recipe_id: recipeId,
      }));
      await db.recipeIngredients.bulkAdd(ingredientsWithRecipeId as RecipeIngredient[]);
    }

    return recipeId;
  },

  async update(id: number, changes: Partial<Recipe>, ingredients?: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]): Promise<void> {
    await db.recipes.update(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });

    if (ingredients !== undefined) {
      // Replace all ingredients
      await db.recipeIngredients.where('recipe_id').equals(id).delete();
      if (ingredients.length > 0) {
        const ingredientsWithRecipeId = ingredients.map(ing => ({
          ...ing,
          recipe_id: id,
        }));
        await db.recipeIngredients.bulkAdd(ingredientsWithRecipeId as RecipeIngredient[]);
      }
    }
  },

  async delete(id: number): Promise<void> {
    await db.transaction('rw', [db.recipes, db.recipeIngredients], async () => {
      await db.recipeIngredients.where('recipe_id').equals(id).delete();
      await db.recipes.delete(id);
    });
  },

  async getByType(projectId: number, recipeType: string): Promise<Recipe[]> {
    const recipes = await db.recipes
      .where('project_id').equals(projectId)
      .filter(r => r.recipe_type === recipeType)
      .toArray();

    for (const recipe of recipes) {
      recipe.ingredients = await db.recipeIngredients
        .where('recipe_id').equals(recipe.id)
        .toArray();
    }
    return recipes;
  },
};

// ============================================================
// ENTITY SERVICES
// ============================================================

export const EntityService = {
  async getAll(projectId?: number): Promise<EntityType[]> {
    let entities: EntityType[];
    if (projectId) {
      entities = await db.entities.where('project_id').equals(projectId).toArray();
    } else {
      entities = await db.entities.toArray();
    }

    // Load drops for each entity
    for (const entity of entities) {
      entity.drops = await db.entityDrops
        .where('entity_id').equals(entity.id)
        .toArray();
    }
    return entities;
  },

  async getById(id: number): Promise<EntityType | undefined> {
    const entity = await db.entities.get(id);
    if (entity) {
      entity.drops = await db.entityDrops
        .where('entity_id').equals(id)
        .toArray();
    }
    return entity;
  },

  async create(entity: Omit<EntityType, 'id'>, drops?: Omit<EntityDrop, 'id' | 'entity_id'>[]): Promise<number> {
    const now = new Date().toISOString();
    const entityId = await db.entities.add({
      ...entity,
      drops: [],
      created_at: now,
      updated_at: now,
    } as unknown as EntityType);

    if (drops && drops.length > 0) {
      const dropsWithEntityId = drops.map(drop => ({
        ...drop,
        entity_id: entityId,
      }));
      await db.entityDrops.bulkAdd(dropsWithEntityId as EntityDrop[]);
    }

    return entityId;
  },

  async update(id: number, changes: Partial<EntityType>, drops?: Omit<EntityDrop, 'id' | 'entity_id'>[]): Promise<void> {
    await db.entities.update(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });

    if (drops !== undefined) {
      // Replace all drops
      await db.entityDrops.where('entity_id').equals(id).delete();
      if (drops.length > 0) {
        const dropsWithEntityId = drops.map(drop => ({
          ...drop,
          entity_id: id,
        }));
        await db.entityDrops.bulkAdd(dropsWithEntityId as EntityDrop[]);
      }
    }
  },

  async delete(id: number): Promise<void> {
    await db.transaction('rw', [db.entities, db.entityDrops], async () => {
      await db.entityDrops.where('entity_id').equals(id).delete();
      await db.entities.delete(id);
    });
  },

  async getByType(projectId: number, entityType: string): Promise<EntityType[]> {
    const entities = await db.entities
      .where('project_id').equals(projectId)
      .filter(e => e.entity_type === entityType)
      .toArray();

    for (const entity of entities) {
      entity.drops = await db.entityDrops
        .where('entity_id').equals(entity.id)
        .toArray();
    }
    return entities;
  },

  async getBosses(projectId: number): Promise<EntityType[]> {
    return this.getByType(projectId, 'boss');
  },
};

// ============================================================
// BUILD LOG SERVICES
// ============================================================

export const BuildLogService = {
  async getAll(projectId: number): Promise<BuildLog[]> {
    return db.buildLogs
      .where('project_id').equals(projectId)
      .reverse()
      .toArray();
  },

  async getById(id: number): Promise<BuildLog | undefined> {
    return db.buildLogs.get(id);
  },

  async create(log: Omit<BuildLog, 'id'>): Promise<number> {
    return db.buildLogs.add({
      ...log,
      created_at: new Date().toISOString(),
    } as BuildLog);
  },

  async getLatest(projectId: number, limit = 10): Promise<BuildLog[]> {
    return db.buildLogs
      .where('project_id').equals(projectId)
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getByStatus(projectId: number, status: string): Promise<BuildLog[]> {
    return db.buildLogs
      .where('project_id').equals(projectId)
      .filter(l => l.status === status)
      .toArray();
  },
};

// ============================================================
// AGENT TASK SERVICES
// ============================================================

export const AgentTaskService = {
  async getAll(projectId: number): Promise<AgentTask[]> {
    return db.agentTasks
      .where('project_id').equals(projectId)
      .reverse()
      .toArray();
  },

  async getById(id: number): Promise<AgentTask | undefined> {
    return db.agentTasks.get(id);
  },

  async create(task: Omit<AgentTask, 'id'>): Promise<number> {
    return db.agentTasks.add({
      ...task,
      created_at: new Date().toISOString(),
    } as AgentTask);
  },

  async update(id: number, changes: Partial<AgentTask>): Promise<void> {
    await db.agentTasks.update(id, changes);
  },

  async getPending(projectId: number): Promise<AgentTask[]> {
    return db.agentTasks
      .where('project_id').equals(projectId)
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .toArray();
  },

  async getCompleted(projectId: number): Promise<AgentTask[]> {
    return db.agentTasks
      .where('project_id').equals(projectId)
      .filter(t => t.status === 'completed')
      .toArray();
  },
};

// ============================================================
// UTILITY SERVICES
// ============================================================

export const DatabaseService = {
  /**
   * Get total counts across all tables for a project
   */
  async getProjectStats(projectId: number): Promise<ProjectStats> {
    return ProjectService.getStats(projectId);
  },

  /**
   * Export all project data as a single JSON object
   */
  async exportProject(projectId: number): Promise<Record<string, unknown>> {
    const [project, blocks, items, enchantments, recipes, entities, buildLogs] =
      await Promise.all([
        ProjectService.getById(projectId),
        BlockService.getAll(projectId),
        ItemService.getAll(projectId),
        EnchantmentService.getAll(projectId),
        RecipeService.getAll(projectId),
        EntityService.getAll(projectId),
        BuildLogService.getAll(projectId),
      ]);

    return {
      project,
      blocks,
      items,
      enchantments,
      recipes,
      entities,
      buildLogs,
      exportedAt: new Date().toISOString(),
    };
  },

  /**
   * Import project data from a JSON export
   */
  async importProject(data: Record<string, unknown>): Promise<number> {
    const projectData = data.project as Omit<Project, 'id'>;
    const projectId = await ProjectService.create(projectData);

    const blocks = (data.blocks || []) as Omit<Block, 'id'>[];
    for (const block of blocks) {
      await BlockService.create({ ...block, project_id: projectId });
    }

    const items = (data.items || []) as Omit<Item, 'id'>[];
    for (const item of items) {
      await ItemService.create({ ...item, project_id: projectId });
    }

    const enchantments = (data.enchantments || []) as Omit<Enchantment, 'id'>[];
    for (const enchantment of enchantments) {
      await EnchantmentService.create({ ...enchantment, project_id: projectId });
    }

    const recipes = (data.recipes || []) as Recipe[];
    for (const recipe of recipes) {
      const { ingredients, ...recipeData } = recipe;
      await RecipeService.create(
        { ...recipeData, project_id: projectId } as unknown as Omit<Recipe, 'id'>,
        ingredients
      );
    }

    const entities = (data.entities || []) as EntityType[];
    for (const entity of entities) {
      const { drops, ...entityData } = entity;
      await EntityService.create(
        { ...entityData, project_id: projectId } as unknown as Omit<EntityType, 'id'>,
        drops
      );
    }

    return projectId;
  },

  /**
   * Duplicate a project with all its content
   */
  async duplicateProject(projectId: number, newName?: string): Promise<number> {
    const exportData = await this.exportProject(projectId);
    const project = exportData.project as Project;
    (exportData.project as Record<string, unknown>).name = newName || `${project.name} (Copy)`;
    return this.importProject(exportData);
  },

  /**
   * Search across all content types
   */
  async globalSearch(projectId: number, query: string): Promise<{
    blocks: Block[];
    items: Item[];
    enchantments: Enchantment[];
    recipes: Recipe[];
    entities: EntityType[];
  }> {
    const [blocks, items, enchantments, recipes, entities] = await Promise.all([
      BlockService.search(projectId, query),
      ItemService.search(projectId, query),
      EnchantmentService.getAll(projectId).then(encs =>
        encs.filter(e =>
          e.enchantment_name.toLowerCase().includes(query.toLowerCase()) ||
          e.display_name.toLowerCase().includes(query.toLowerCase())
        )
      ),
      RecipeService.getAll(projectId).then(recs =>
        recs.filter(r => r.recipe_name.toLowerCase().includes(query.toLowerCase()))
      ),
      EntityService.getAll(projectId).then(ents =>
        ents.filter(e =>
          e.entity_name.toLowerCase().includes(query.toLowerCase()) ||
          e.display_name.toLowerCase().includes(query.toLowerCase())
        )
      ),
    ]);

    return { blocks, items, enchantments, recipes, entities };
  },
};
