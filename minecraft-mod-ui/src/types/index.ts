/**
 * Type definitions for Minecraft Mod Generator UI
 */

// Project Types
export interface Project {
  id: number;
  name: string;
  description?: string;
  minecraft_version: string;
  mod_loader: 'fabric' | 'forge' | 'neoforge';
  mod_version: string;
  author: string;
  namespace: string;
  build_count: number;
  last_build_at?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// Block Types
export interface Block {
  id: number;
  project_id: number;
  block_name: string;
  display_name: string;
  namespace: string;
  hardness: number;
  resistance: number;
  slipperiness: number;
  speed_factor: number;
  friction_factor: number;
  luminance: number;
  is_replaceable: boolean;
  is_solid: boolean;
  has_collision: boolean;
  is_full_block: boolean;
  has_gravity: boolean;
  is_flammable: boolean;
  flammability_level: number;
  fire_spreadability: number;
  can_be_hydrated: boolean;
  texture_top?: string;
  texture_bottom?: string;
  texture_side?: string;
  texture_all?: string;
  custom_model_data?: number;
  material_type: 'stone' | 'dirt' | 'wood' | 'ore' | 'metal' | 'glass' | 'fabric' | 'decorative' | 'other';
  created_at: string;
  updated_at: string;
}

// Item Types
export interface Item {
  id: number;
  project_id: number;
  item_name: string;
  display_name: string;
  namespace: string;
  max_stack_size: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  is_enchantable: boolean;
  is_consumable: boolean;
  food_nutrition?: number;
  food_saturation?: number;
  is_weapon: boolean;
  is_armor: boolean;
  is_tool: boolean;
  durability?: number;
  attack_damage?: number;
  attack_speed: number;
  texture_path?: string;
  custom_model_data?: number;
  created_at: string;
  updated_at: string;
}

// Enchantment Types
export interface Enchantment {
  id: number;
  project_id: number;
  enchantment_name: string;
  display_name: string;
  namespace: string;
  description?: string;
  max_level: number;
  is_treasure: boolean;
  is_curse: boolean;
  can_anvil_merge: boolean;
  anvil_cost: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

// Recipe Types
export interface RecipeIngredient {
  id?: number;
  recipe_id?: number;
  item_id?: number;
  block_id?: number;
  tag_name?: string;
  count: number;
  position: number;
}

export interface Recipe {
  id: number;
  project_id: number;
  recipe_name: string;
  output_item_id?: number;
  output_block_id?: number;
  output_count: number;
  recipe_type: 'shaped' | 'shapeless' | 'smelting' | 'smoking' | 'blasting' | 'campfire' | 'stonecutting' | 'smithing';
  cook_time?: number;
  experience: number;
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

// Entity Types
export interface EntityDrop {
  id?: number;
  entity_id?: number;
  drop_item_id?: number;
  drop_block_id?: number;
  min_count: number;
  max_count: number;
  drop_chance: number;
  requires_player_kill: boolean;
  drop_level_bonus_multiplier: number;
}

export interface EntityType {
  id: number;
  project_id: number;
  entity_name: string;
  namespace: string;
  display_name: string;
  entity_type: 'hostile' | 'passive' | 'neutral' | 'boss' | 'other';
  max_health: number;
  armor_value: number;
  armor_toughness: number;
  knockback_resistance: number;
  attack_damage?: number;
  attack_speed: number;
  movement_speed: number;
  follow_range: number;
  spawn_weight?: number;
  spawn_type: 'natural' | 'egg' | 'spawner' | 'none';
  spawn_group?: string;
  min_group_size: number;
  max_group_size: number;
  texture_path?: string;
  model_path?: string;
  drops: EntityDrop[];
  created_at: string;
  updated_at: string;
}

// Build Log Types
export interface BuildLog {
  id: number;
  project_id: number;
  build_number: number;
  status: 'success' | 'failed' | 'warning';
  log_content: string;
  error_summary?: string;
  warnings_count: number;
  errors_count: number;
  build_time_ms?: number;
  created_at: string;
}

// Agent Task Types
export interface AgentTask {
  id: number;
  project_id: number;
  task_type: string;
  agent_type: 'architect' | 'logic' | 'ui' | 'reviewer';
  input_data: string;
  output_data?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// UI State Types
export interface EditorState {
  currentProject: Project | null;
  selectedItem: Block | Item | null;
  selectedItemType: 'block' | 'item' | 'recipe' | 'entity' | null;
  isDirty: boolean;
}

export interface ConsoleMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
}

export interface ProjectStats {
  block_count: number;
  item_count: number;
  enchantment_count: number;
  recipe_count: number;
  entity_count: number;
  build_count: number;
}
