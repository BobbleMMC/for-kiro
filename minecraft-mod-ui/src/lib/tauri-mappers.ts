/**
 * Mappers between the Rust DB shape (snake_case, narrow column set) and the
 * richer TypeScript domain types declared in `src/types`.
 *
 * The Rust side stores only the columns we actually persist; the frontend
 * types include UI-only or future-reserved fields (e.g. `slipperiness`,
 * `is_replaceable`, food stats). For those we fill defaults on read and
 * drop them on write.
 */

import type { Project, Block, Item } from '../types';
import type { TauriProject, TauriBlock, TauriItem } from './tauri-api';

// ============================================================================
// Project
// ============================================================================

export function projectFromTauri(t: TauriProject): Project {
  const now = new Date().toISOString();
  return {
    id: t.id ?? 0,
    name: t.name,
    description: t.description ?? undefined,
    minecraft_version: t.minecraft_version,
    mod_loader: (t.mod_loader as Project['mod_loader']) ?? 'fabric',
    mod_version: t.mod_version,
    author: t.author,
    namespace: t.namespace,
    build_count: t.build_count,
    is_archived: t.is_archived,
    created_at: t.created_at ?? now,
    updated_at: t.updated_at ?? now,
  };
}

// ============================================================================
// Block
// ============================================================================

export function blockFromTauri(t: TauriBlock): Block {
  const now = new Date().toISOString();
  return {
    id: t.id ?? 0,
    project_id: t.project_id,
    block_name: t.block_name,
    display_name: t.display_name,
    namespace: t.namespace,
    hardness: t.hardness,
    resistance: t.resistance,
    slipperiness: 0.6, // default — not persisted yet
    speed_factor: 1.0,
    friction_factor: 0.6,
    luminance: t.luminance,
    is_replaceable: false,
    is_solid: t.is_solid,
    has_collision: t.has_collision,
    is_full_block: true,
    has_gravity: t.has_gravity,
    is_flammable: t.is_flammable,
    flammability_level: t.is_flammable ? 5 : 0,
    fire_spreadability: t.is_flammable ? 5 : 0,
    can_be_hydrated: false,
    texture_top: undefined,
    texture_bottom: undefined,
    texture_side: undefined,
    texture_all: t.texture_all ?? undefined,
    custom_model_data: undefined,
    material_type: (t.material_type as Block['material_type']) ?? 'stone',
    created_at: now,
    updated_at: now,
  };
}

export function blockToTauri(b: Block): TauriBlock {
  return {
    id: b.id || null,
    project_id: b.project_id,
    block_name: b.block_name,
    display_name: b.display_name,
    namespace: b.namespace,
    hardness: b.hardness,
    resistance: b.resistance,
    luminance: b.luminance,
    is_solid: b.is_solid,
    has_collision: b.has_collision,
    has_gravity: b.has_gravity,
    is_flammable: b.is_flammable,
    material_type: b.material_type,
    texture_all: b.texture_all ?? null,
  };
}

// ============================================================================
// Item
// ============================================================================

export function itemFromTauri(t: TauriItem): Item {
  const now = new Date().toISOString();
  return {
    id: t.id ?? 0,
    project_id: t.project_id,
    item_name: t.item_name,
    display_name: t.display_name,
    namespace: t.namespace,
    max_stack_size: t.max_stack_size,
    rarity: (t.rarity as Item['rarity']) ?? 'common',
    is_enchantable: t.is_enchantable,
    is_consumable: false,
    food_nutrition: undefined,
    food_saturation: undefined,
    is_weapon: (t.attack_damage ?? 0) > 0,
    is_armor: false,
    is_tool: (t.durability ?? 0) > 0,
    durability: t.durability ?? undefined,
    attack_damage: t.attack_damage ?? undefined,
    attack_speed: 4.0,
    texture_path: t.texture_path ?? undefined,
    custom_model_data: undefined,
    created_at: now,
    updated_at: now,
  };
}

export function itemToTauri(i: Item): TauriItem {
  return {
    id: i.id || null,
    project_id: i.project_id,
    item_name: i.item_name,
    display_name: i.display_name,
    namespace: i.namespace,
    max_stack_size: i.max_stack_size,
    rarity: i.rarity,
    is_enchantable: i.is_enchantable,
    durability: i.durability ?? null,
    attack_damage: i.attack_damage ?? null,
    texture_path: i.texture_path ?? null,
  };
}
