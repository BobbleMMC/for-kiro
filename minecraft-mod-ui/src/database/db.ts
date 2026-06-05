/**
 * Dexie.js Database Schema for Minecraft Mod Generator
 * Self-populating IndexedDB database with auto-migration support
 */

import Dexie, { type Table } from 'dexie';
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
} from '../types';

export class MinecraftModDB extends Dexie {
  // Table declarations
  projects!: Table<Project, number>;
  blocks!: Table<Block, number>;
  items!: Table<Item, number>;
  enchantments!: Table<Enchantment, number>;
  recipes!: Table<Recipe, number>;
  recipeIngredients!: Table<RecipeIngredient, number>;
  entities!: Table<EntityType, number>;
  entityDrops!: Table<EntityDrop, number>;
  buildLogs!: Table<BuildLog, number>;
  agentTasks!: Table<AgentTask, number>;
  metadata!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('MinecraftModGeneratorDB');

    // Version 1 - Initial schema
    this.version(1).stores({
      projects: '++id, name, minecraft_version, mod_loader, namespace, is_archived, created_at, updated_at',
      blocks: '++id, project_id, block_name, display_name, namespace, material_type, created_at',
      items: '++id, project_id, item_name, display_name, namespace, rarity, created_at',
      enchantments: '++id, project_id, enchantment_name, display_name, namespace, created_at',
      recipes: '++id, project_id, recipe_name, recipe_type, output_item_id, output_block_id, created_at',
      recipeIngredients: '++id, recipe_id, item_id, block_id, position',
      entities: '++id, project_id, entity_name, display_name, namespace, entity_type, created_at',
      entityDrops: '++id, entity_id, drop_item_id, drop_block_id',
      buildLogs: '++id, project_id, build_number, status, created_at',
      agentTasks: '++id, project_id, task_type, agent_type, status, created_at',
      metadata: 'key',
    });
  }
}

// Singleton database instance
export const db = new MinecraftModDB();

/**
 * Check if the database has been seeded
 */
export async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const seedRecord = await db.metadata.get('seeded');
    return seedRecord?.value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark database as seeded
 */
export async function markAsSeeded(): Promise<void> {
  await db.metadata.put({ key: 'seeded', value: 'true' });
}

/**
 * Get the seed version (for future migrations of seed data)
 */
export async function getSeedVersion(): Promise<number> {
  try {
    const versionRecord = await db.metadata.get('seed_version');
    return versionRecord ? parseInt(versionRecord.value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Set the seed version
 */
export async function setSeedVersion(version: number): Promise<void> {
  await db.metadata.put({ key: 'seed_version', value: version.toString() });
}

/**
 * Reset the entire database (useful for development)
 */
export async function resetDatabase(): Promise<void> {
  await db.delete();
  await db.open();
}

export default db;
