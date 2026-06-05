/**
 * Seed Data for Minecraft Mod Generator Database
 * Auto-populates the database with default Minecraft content on first launch
 */

import { db, isDatabaseSeeded, markAsSeeded, setSeedVersion } from './db';
import type {
  Project,
  Block,
  Item,
  Enchantment,
  Recipe,
  RecipeIngredient,
  EntityType,
  EntityDrop,
} from '../types';

// Current seed version - increment when adding new seed data
const CURRENT_SEED_VERSION = 1;

// ============================================================
// DEFAULT PROJECT
// ============================================================

const defaultProject: Omit<Project, 'id'> = {
  name: 'My First Mod',
  description: 'A sample Minecraft mod with custom blocks, items, recipes, and entities',
  minecraft_version: '1.20.4',
  mod_loader: 'fabric',
  mod_version: '1.0.0',
  author: 'ModDeveloper',
  namespace: 'myfirstmod',
  build_count: 0,
  is_archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================
// DEFAULT BLOCKS
// ============================================================

const defaultBlocks: Omit<Block, 'id'>[] = [
  {
    project_id: 1,
    block_name: 'ruby_ore',
    display_name: 'Ruby Ore',
    namespace: 'myfirstmod',
    hardness: 3.0,
    resistance: 3.0,
    slipperiness: 0.6,
    speed_factor: 1.0,
    friction_factor: 1.0,
    luminance: 0,
    is_replaceable: false,
    is_solid: true,
    has_collision: true,
    is_full_block: true,
    has_gravity: false,
    is_flammable: false,
    flammability_level: 0,
    fire_spreadability: 0,
    can_be_hydrated: false,
    material_type: 'ore',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    block_name: 'ruby_block',
    display_name: 'Block of Ruby',
    namespace: 'myfirstmod',
    hardness: 5.0,
    resistance: 6.0,
    slipperiness: 0.6,
    speed_factor: 1.0,
    friction_factor: 1.0,
    luminance: 3,
    is_replaceable: false,
    is_solid: true,
    has_collision: true,
    is_full_block: true,
    has_gravity: false,
    is_flammable: false,
    flammability_level: 0,
    fire_spreadability: 0,
    can_be_hydrated: false,
    material_type: 'metal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    block_name: 'enchanted_stone',
    display_name: 'Enchanted Stone',
    namespace: 'myfirstmod',
    hardness: 4.0,
    resistance: 8.0,
    slipperiness: 0.6,
    speed_factor: 1.0,
    friction_factor: 1.0,
    luminance: 7,
    is_replaceable: false,
    is_solid: true,
    has_collision: true,
    is_full_block: true,
    has_gravity: false,
    is_flammable: false,
    flammability_level: 0,
    fire_spreadability: 0,
    can_be_hydrated: false,
    material_type: 'stone',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    block_name: 'magic_log',
    display_name: 'Magic Log',
    namespace: 'myfirstmod',
    hardness: 2.0,
    resistance: 2.0,
    slipperiness: 0.6,
    speed_factor: 1.0,
    friction_factor: 1.0,
    luminance: 2,
    is_replaceable: false,
    is_solid: true,
    has_collision: true,
    is_full_block: true,
    has_gravity: false,
    is_flammable: true,
    flammability_level: 5,
    fire_spreadability: 5,
    can_be_hydrated: false,
    material_type: 'wood',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    block_name: 'crystal_glass',
    display_name: 'Crystal Glass',
    namespace: 'myfirstmod',
    hardness: 0.3,
    resistance: 0.3,
    slipperiness: 0.6,
    speed_factor: 1.0,
    friction_factor: 1.0,
    luminance: 10,
    is_replaceable: false,
    is_solid: true,
    has_collision: true,
    is_full_block: true,
    has_gravity: false,
    is_flammable: false,
    flammability_level: 0,
    fire_spreadability: 0,
    can_be_hydrated: false,
    material_type: 'glass',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    block_name: 'dark_sand',
    display_name: 'Dark Sand',
    namespace: 'myfirstmod',
    hardness: 0.5,
    resistance: 0.5,
    slipperiness: 0.6,
    speed_factor: 0.8,
    friction_factor: 1.0,
    luminance: 0,
    is_replaceable: false,
    is_solid: true,
    has_collision: true,
    is_full_block: true,
    has_gravity: true,
    is_flammable: false,
    flammability_level: 0,
    fire_spreadability: 0,
    can_be_hydrated: false,
    material_type: 'dirt',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// DEFAULT ITEMS
// ============================================================

const defaultItems: Omit<Item, 'id'>[] = [
  {
    project_id: 1,
    item_name: 'ruby',
    display_name: 'Ruby',
    namespace: 'myfirstmod',
    max_stack_size: 64,
    rarity: 'uncommon',
    is_enchantable: false,
    is_consumable: false,
    is_weapon: false,
    is_armor: false,
    is_tool: false,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'ruby_sword',
    display_name: 'Ruby Sword',
    namespace: 'myfirstmod',
    max_stack_size: 1,
    rarity: 'rare',
    is_enchantable: true,
    is_consumable: false,
    is_weapon: true,
    is_armor: false,
    is_tool: false,
    durability: 1561,
    attack_damage: 8,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'ruby_pickaxe',
    display_name: 'Ruby Pickaxe',
    namespace: 'myfirstmod',
    max_stack_size: 1,
    rarity: 'rare',
    is_enchantable: true,
    is_consumable: false,
    is_weapon: false,
    is_armor: false,
    is_tool: true,
    durability: 2031,
    attack_damage: 5,
    attack_speed: 1.2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'ruby_helmet',
    display_name: 'Ruby Helmet',
    namespace: 'myfirstmod',
    max_stack_size: 1,
    rarity: 'rare',
    is_enchantable: true,
    is_consumable: false,
    is_weapon: false,
    is_armor: true,
    is_tool: false,
    durability: 407,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'ruby_chestplate',
    display_name: 'Ruby Chestplate',
    namespace: 'myfirstmod',
    max_stack_size: 1,
    rarity: 'rare',
    is_enchantable: true,
    is_consumable: false,
    is_weapon: false,
    is_armor: true,
    is_tool: false,
    durability: 592,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'magic_apple',
    display_name: 'Magic Apple',
    namespace: 'myfirstmod',
    max_stack_size: 16,
    rarity: 'epic',
    is_enchantable: false,
    is_consumable: true,
    food_nutrition: 8,
    food_saturation: 12.8,
    is_weapon: false,
    is_armor: false,
    is_tool: false,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'crystal_shard',
    display_name: 'Crystal Shard',
    namespace: 'myfirstmod',
    max_stack_size: 64,
    rarity: 'uncommon',
    is_enchantable: false,
    is_consumable: false,
    is_weapon: false,
    is_armor: false,
    is_tool: false,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    item_name: 'enchanted_book_fragment',
    display_name: 'Enchanted Book Fragment',
    namespace: 'myfirstmod',
    max_stack_size: 64,
    rarity: 'rare',
    is_enchantable: false,
    is_consumable: false,
    is_weapon: false,
    is_armor: false,
    is_tool: false,
    attack_speed: 1.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// DEFAULT ENCHANTMENTS
// ============================================================

const defaultEnchantments: Omit<Enchantment, 'id'>[] = [
  {
    project_id: 1,
    enchantment_name: 'ruby_fortune',
    display_name: 'Ruby Fortune',
    namespace: 'myfirstmod',
    description: 'Increases ruby drop rate from Ruby Ore',
    max_level: 3,
    is_treasure: false,
    is_curse: false,
    can_anvil_merge: true,
    anvil_cost: 4,
    weight: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    enchantment_name: 'crystal_resonance',
    display_name: 'Crystal Resonance',
    namespace: 'myfirstmod',
    description: 'Weapons emit crystal energy on hit, dealing bonus magic damage',
    max_level: 5,
    is_treasure: true,
    is_curse: false,
    can_anvil_merge: true,
    anvil_cost: 8,
    weight: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    enchantment_name: 'void_touch',
    display_name: 'Void Touch',
    namespace: 'myfirstmod',
    description: 'A cursed enchantment that slowly damages the wielder but deals massive damage',
    max_level: 2,
    is_treasure: true,
    is_curse: true,
    can_anvil_merge: false,
    anvil_cost: 0,
    weight: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    enchantment_name: 'auto_smelt',
    display_name: 'Auto Smelt',
    namespace: 'myfirstmod',
    description: 'Automatically smelts mined ores into ingots',
    max_level: 1,
    is_treasure: false,
    is_curse: false,
    can_anvil_merge: true,
    anvil_cost: 6,
    weight: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// DEFAULT RECIPES
// ============================================================

const defaultRecipes: Omit<Recipe, 'id'>[] = [
  {
    project_id: 1,
    recipe_name: 'ruby_block_from_rubies',
    output_block_id: 2, // ruby_block
    output_count: 1,
    recipe_type: 'shaped',
    experience: 0,
    ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    recipe_name: 'rubies_from_ruby_block',
    output_item_id: 1, // ruby
    output_count: 9,
    recipe_type: 'shapeless',
    experience: 0,
    ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    recipe_name: 'ruby_sword_craft',
    output_item_id: 2, // ruby_sword
    output_count: 1,
    recipe_type: 'shaped',
    experience: 0,
    ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    recipe_name: 'ruby_from_ore_smelting',
    output_item_id: 1, // ruby
    output_count: 1,
    recipe_type: 'smelting',
    cook_time: 200,
    experience: 1.0,
    ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    recipe_name: 'ruby_from_ore_blasting',
    output_item_id: 1, // ruby
    output_count: 1,
    recipe_type: 'blasting',
    cook_time: 100,
    experience: 1.0,
    ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    recipe_name: 'crystal_glass_craft',
    output_block_id: 5, // crystal_glass
    output_count: 4,
    recipe_type: 'shaped',
    experience: 0,
    ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Recipe ingredients (separate table)
const defaultRecipeIngredients: Omit<RecipeIngredient, 'id'>[] = [
  // ruby_block_from_rubies - 9 rubies in 3x3 grid
  { recipe_id: 1, item_id: 1, count: 1, position: 0 },
  { recipe_id: 1, item_id: 1, count: 1, position: 1 },
  { recipe_id: 1, item_id: 1, count: 1, position: 2 },
  { recipe_id: 1, item_id: 1, count: 1, position: 3 },
  { recipe_id: 1, item_id: 1, count: 1, position: 4 },
  { recipe_id: 1, item_id: 1, count: 1, position: 5 },
  { recipe_id: 1, item_id: 1, count: 1, position: 6 },
  { recipe_id: 1, item_id: 1, count: 1, position: 7 },
  { recipe_id: 1, item_id: 1, count: 1, position: 8 },
  // rubies_from_ruby_block - 1 ruby block
  { recipe_id: 2, block_id: 2, count: 1, position: 0 },
  // ruby_sword_craft - ruby + ruby + stick pattern
  { recipe_id: 3, item_id: 1, count: 1, position: 1 }, // top center
  { recipe_id: 3, item_id: 1, count: 1, position: 4 }, // middle center
  { recipe_id: 3, tag_name: 'minecraft:sticks', count: 1, position: 7 }, // bottom center
  // ruby_from_ore_smelting - 1 ruby_ore
  { recipe_id: 4, block_id: 1, count: 1, position: 0 },
  // ruby_from_ore_blasting - 1 ruby_ore
  { recipe_id: 5, block_id: 1, count: 1, position: 0 },
  // crystal_glass_craft - crystal shards + glass panes
  { recipe_id: 6, item_id: 7, count: 1, position: 0 }, // crystal_shard
  { recipe_id: 6, tag_name: 'minecraft:glass', count: 1, position: 1 },
  { recipe_id: 6, item_id: 7, count: 1, position: 2 }, // crystal_shard
  { recipe_id: 6, tag_name: 'minecraft:glass', count: 1, position: 3 },
];

// ============================================================
// DEFAULT ENTITIES
// ============================================================

const defaultEntities: Omit<EntityType, 'id'>[] = [
  {
    project_id: 1,
    entity_name: 'ruby_golem',
    namespace: 'myfirstmod',
    display_name: 'Ruby Golem',
    entity_type: 'neutral',
    max_health: 80,
    armor_value: 8,
    armor_toughness: 4,
    knockback_resistance: 0.6,
    attack_damage: 12,
    attack_speed: 0.8,
    movement_speed: 0.25,
    follow_range: 24,
    spawn_weight: 5,
    spawn_type: 'natural',
    spawn_group: 'creature',
    min_group_size: 1,
    max_group_size: 1,
    drops: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    entity_name: 'crystal_bat',
    namespace: 'myfirstmod',
    display_name: 'Crystal Bat',
    entity_type: 'passive',
    max_health: 6,
    armor_value: 0,
    armor_toughness: 0,
    knockback_resistance: 0,
    attack_damage: undefined,
    attack_speed: 1.0,
    movement_speed: 0.4,
    follow_range: 16,
    spawn_weight: 10,
    spawn_type: 'natural',
    spawn_group: 'ambient',
    min_group_size: 2,
    max_group_size: 4,
    drops: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    entity_name: 'shadow_wraith',
    namespace: 'myfirstmod',
    display_name: 'Shadow Wraith',
    entity_type: 'hostile',
    max_health: 30,
    armor_value: 2,
    armor_toughness: 0,
    knockback_resistance: 0.2,
    attack_damage: 7,
    attack_speed: 1.4,
    movement_speed: 0.35,
    follow_range: 32,
    spawn_weight: 8,
    spawn_type: 'natural',
    spawn_group: 'monster',
    min_group_size: 1,
    max_group_size: 3,
    drops: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    project_id: 1,
    entity_name: 'crystal_dragon',
    namespace: 'myfirstmod',
    display_name: 'Crystal Dragon',
    entity_type: 'boss',
    max_health: 300,
    armor_value: 12,
    armor_toughness: 8,
    knockback_resistance: 1.0,
    attack_damage: 20,
    attack_speed: 0.6,
    movement_speed: 0.3,
    follow_range: 64,
    spawn_type: 'spawner',
    spawn_group: 'boss',
    min_group_size: 1,
    max_group_size: 1,
    drops: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Entity drops (separate table)
const defaultEntityDrops: Omit<EntityDrop, 'id'>[] = [
  // Ruby Golem drops
  { entity_id: 1, drop_item_id: 1, min_count: 2, max_count: 5, drop_chance: 1.0, requires_player_kill: false, drop_level_bonus_multiplier: 0.5 },
  { entity_id: 1, drop_item_id: 7, min_count: 1, max_count: 3, drop_chance: 0.5, requires_player_kill: true, drop_level_bonus_multiplier: 0.2 },
  // Crystal Bat drops
  { entity_id: 2, drop_item_id: 7, min_count: 0, max_count: 2, drop_chance: 0.3, requires_player_kill: false, drop_level_bonus_multiplier: 0.1 },
  // Shadow Wraith drops
  { entity_id: 3, drop_item_id: 8, min_count: 1, max_count: 2, drop_chance: 0.6, requires_player_kill: true, drop_level_bonus_multiplier: 0.3 },
  // Crystal Dragon drops
  { entity_id: 4, drop_item_id: 1, min_count: 10, max_count: 20, drop_chance: 1.0, requires_player_kill: true, drop_level_bonus_multiplier: 1.0 },
  { entity_id: 4, drop_item_id: 7, min_count: 5, max_count: 15, drop_chance: 1.0, requires_player_kill: true, drop_level_bonus_multiplier: 0.5 },
  { entity_id: 4, drop_item_id: 6, min_count: 1, max_count: 2, drop_chance: 0.25, requires_player_kill: true, drop_level_bonus_multiplier: 0 },
];

// ============================================================
// SEED FUNCTION
// ============================================================

/**
 * Seeds the database with default content.
 * Only runs once unless the database is reset.
 */
export async function seedDatabase(): Promise<void> {
  const alreadySeeded = await isDatabaseSeeded();

  if (alreadySeeded) {
    console.log('[DB] Database already seeded, skipping...');
    return;
  }

  console.log('[DB] Seeding database with default content...');

  try {
    await db.transaction('rw', [
      db.projects,
      db.blocks,
      db.items,
      db.enchantments,
      db.recipes,
      db.recipeIngredients,
      db.entities,
      db.entityDrops,
      db.metadata,
    ], async () => {
      // Seed project
      await db.projects.add(defaultProject as Project);
      console.log('[DB] ✓ Project seeded');

      // Seed blocks
      await db.blocks.bulkAdd(defaultBlocks as Block[]);
      console.log(`[DB] ✓ ${defaultBlocks.length} blocks seeded`);

      // Seed items
      await db.items.bulkAdd(defaultItems as Item[]);
      console.log(`[DB] ✓ ${defaultItems.length} items seeded`);

      // Seed enchantments
      await db.enchantments.bulkAdd(defaultEnchantments as Enchantment[]);
      console.log(`[DB] ✓ ${defaultEnchantments.length} enchantments seeded`);

      // Seed recipes
      await db.recipes.bulkAdd(defaultRecipes as Recipe[]);
      console.log(`[DB] ✓ ${defaultRecipes.length} recipes seeded`);

      // Seed recipe ingredients
      await db.recipeIngredients.bulkAdd(defaultRecipeIngredients as RecipeIngredient[]);
      console.log(`[DB] ✓ ${defaultRecipeIngredients.length} recipe ingredients seeded`);

      // Seed entities
      await db.entities.bulkAdd(defaultEntities as EntityType[]);
      console.log(`[DB] ✓ ${defaultEntities.length} entities seeded`);

      // Seed entity drops
      await db.entityDrops.bulkAdd(defaultEntityDrops as EntityDrop[]);
      console.log(`[DB] ✓ ${defaultEntityDrops.length} entity drops seeded`);

      // Mark as seeded
      await markAsSeeded();
      await setSeedVersion(CURRENT_SEED_VERSION);
    });

    console.log('[DB] ✓ Database seeding complete!');
  } catch (error) {
    console.error('[DB] ✗ Database seeding failed:', error);
    throw error;
  }
}

export { CURRENT_SEED_VERSION };
