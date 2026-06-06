/**
 * Tauri API Bridge
 *
 * Type-safe wrappers around every Rust `#[tauri::command]` registered in
 * `src-tauri/src/lib.rs`. Frontend hooks call these instead of `invoke()`
 * directly so the call sites stay readable and the type contract is local
 * to this file.
 *
 * Falls back to throwing in pure-browser dev environments — the `useProject`
 * / `useContent` hooks branch on `isTauri()` and degrade to in-memory mode.
 */

// Tauri 2 sets `__TAURI_INTERNALS__` (the v1 global was `__TAURI__`).
// Either is fine — we just need to detect that we're inside the shell.
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
};

const invoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauri()) {
    throw new Error(`Tauri not available. Command: ${command}`);
  }
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(command, args);
};

// ============================================================================
// Project API
// ============================================================================

export interface TauriProject {
  id: number | null;
  name: string;
  description: string | null;
  minecraft_version: string;
  mod_loader: string;
  mod_version: string;
  author: string;
  namespace: string;
  build_count: number;
  is_archived: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  minecraft_version: string;
  mod_loader: string;
  mod_version?: string;
  author: string;
  namespace: string;
}

export interface UpdateProjectInput extends Required<Omit<CreateProjectInput, 'mod_version'>> {
  id: number;
  description: string | null;
  mod_version: string;
}

export const createProject = (data: CreateProjectInput): Promise<number> =>
  invoke<number>('create_project', { ...data, description: data.description ?? null });

export const updateProject = (data: UpdateProjectInput): Promise<void> =>
  invoke<void>('update_project', data);

export const getProjects = (): Promise<TauriProject[]> => invoke<TauriProject[]>('get_projects');

export const getProject = (id: number): Promise<TauriProject | null> =>
  invoke<TauriProject | null>('get_project', { id });

export const deleteProject = (id: number): Promise<void> =>
  invoke<void>('delete_project', { id });

// ============================================================================
// Block API
// ============================================================================

export interface TauriBlock {
  id: number | null;
  project_id: number;
  block_name: string;
  display_name: string;
  namespace: string;
  hardness: number;
  resistance: number;
  luminance: number;
  is_solid: boolean;
  has_collision: boolean;
  has_gravity: boolean;
  is_flammable: boolean;
  material_type: string;
  texture_all: string | null;
}

export type CreateBlockInput = Omit<TauriBlock, 'id'>;
export type UpdateBlockInput = TauriBlock & { id: number };

export const createBlock = (data: CreateBlockInput): Promise<number> =>
  invoke<number>('create_block', data);

export const updateBlock = (data: UpdateBlockInput): Promise<void> =>
  invoke<void>('update_block', data);

export const deleteBlock = (id: number): Promise<void> => invoke<void>('delete_block', { id });

export const getBlock = (id: number): Promise<TauriBlock | null> =>
  invoke<TauriBlock | null>('get_block', { id });

export const getBlocks = (project_id: number): Promise<TauriBlock[]> =>
  invoke<TauriBlock[]>('get_blocks', { project_id });

// ============================================================================
// Item API
// ============================================================================

export interface TauriItem {
  id: number | null;
  project_id: number;
  item_name: string;
  display_name: string;
  namespace: string;
  max_stack_size: number;
  rarity: string;
  is_enchantable: boolean;
  durability: number | null;
  attack_damage: number | null;
  texture_path: string | null;
  // Extended item rules (PR #24) — all optional so legacy code stays valid.
  has_glint?: boolean;
  is_fire_resistant?: boolean;
  food_eat_seconds?: number | null;
  food_always_eat?: boolean;
  food_eat_fast?: boolean;
  food_effects_json?: string | null;
  tool_kind?: string | null;
  tool_tier?: string | null;
  armor_material?: string | null;
  armor_slot?: string | null;
  armor_defense?: number | null;
  armor_toughness?: number | null;
  knockback_resistance?: number | null;
  attribute_modifiers_json?: string | null;
  tags_json?: string | null;
  custom_nbt_json?: string | null;
  tooltip_lines_json?: string | null;
  uses_remaining?: number | null;
  cooldown_ticks?: number | null;
  burn_time_ticks?: number | null;
  repair_ingredient?: string | null;
  recipe_remainder?: string | null;
}

/**
 * Optional extended-rules payload sent alongside `create_item` /
 * `update_item`. The Rust side parses it as `ItemExtras` and merges it
 * into the persisted Item row.
 */
export interface ItemExtras {
  has_glint?: boolean;
  is_fire_resistant?: boolean;
  food_eat_seconds?: number;
  food_always_eat?: boolean;
  food_eat_fast?: boolean;
  food_effects_json?: string;
  tool_kind?: 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'sword' | string;
  tool_tier?: 'WOOD' | 'STONE' | 'IRON' | 'GOLD' | 'DIAMOND' | 'NETHERITE' | string;
  armor_material?: string;
  armor_slot?: 'head' | 'chest' | 'legs' | 'feet' | string;
  armor_defense?: number;
  armor_toughness?: number;
  knockback_resistance?: number;
  attribute_modifiers_json?: string;
  tags_json?: string;
  custom_nbt_json?: string;
  tooltip_lines_json?: string;
  uses_remaining?: number;
  cooldown_ticks?: number;
  burn_time_ticks?: number;
  repair_ingredient?: string;
  recipe_remainder?: string;
}

export type CreateItemInput = Omit<TauriItem, 'id'> & { extras_json?: string };
export type UpdateItemInput = TauriItem & { id: number; extras_json?: string };

export const createItem = (data: CreateItemInput): Promise<number> =>
  invoke<number>('create_item', data);

export const updateItem = (data: UpdateItemInput): Promise<void> =>
  invoke<void>('update_item', data);

export const deleteItem = (id: number): Promise<void> => invoke<void>('delete_item', { id });

export const getItem = (id: number): Promise<TauriItem | null> =>
  invoke<TauriItem | null>('get_item', { id });

export const getItems = (project_id: number): Promise<TauriItem[]> =>
  invoke<TauriItem[]>('get_items', { project_id });

// ============================================================================
// Visual Graph API
// ============================================================================

export interface TauriVisualGraph {
  id: number | null;
  project_id: number;
  graph_name: string;
  graph_type: string;
  nodes_json: string;
  edges_json: string;
  viewport_json: string;
  is_active: boolean;
}

export interface SaveVisualGraphInput {
  id?: number;
  project_id: number;
  graph_name: string;
  graph_type: string;
  nodes_json: string;
  edges_json: string;
  viewport_json: string;
}

export const saveVisualGraph = (data: SaveVisualGraphInput): Promise<number> =>
  invoke<number>('save_visual_graph', data);

export const getVisualGraphs = (project_id: number): Promise<TauriVisualGraph[]> =>
  invoke<TauriVisualGraph[]>('get_visual_graphs', { project_id });

// ============================================================================
// Codegen API
// ============================================================================

export interface GeneratedFile {
  file_name: string;
  package_path: string;
  source: string;
}

export const generateEventHandlers = (graph_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_event_handlers', { graph_id });

export const generateBlockClass = (block_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_block_class', { block_id });

export const generateItemClass = (item_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_item_class', { item_id });

export interface WriteResult {
  absolute_path: string;
  relative_path: string;
}

export const writeGeneratedFile = (data: {
  project_id: number;
  package_path: string;
  file_name: string;
  source: string;
}): Promise<WriteResult> => invoke<WriteResult>('write_generated_file', data);

// ============================================================================
// Scaffold API
// ============================================================================

export interface ScaffoldResult {
  project_path: string;
  files_written: string[];
}

export const scaffoldProject = (project_id: number, target_dir: string): Promise<ScaffoldResult> =>
  invoke<ScaffoldResult>('scaffold_project', { project_id, target_dir });

export const getProjectPath = (project_id: number): Promise<string | null> =>
  invoke<string | null>('get_project_path', { project_id });

// ============================================================================
// Build API
// ============================================================================

export interface BuildOutput {
  status: 'success' | 'failed' | string;
  output: string;
  errors: string[];
  build_time_ms: number;
  artifact_path: string | null;
}

export const runGradleBuild = (
  args: { project_id?: number; project_path?: string }
): Promise<BuildOutput> => invoke<BuildOutput>('run_gradle_build', args);

export const checkJavaVersion = (): Promise<string> => invoke<string>('check_java_version');

// ============================================================================
// File watcher API
// ============================================================================

export const startWatching = (project_id: number): Promise<string> =>
  invoke<string>('start_watching', { project_id });

export const stopWatching = (): Promise<void> => invoke<void>('stop_watching');

// ============================================================================
// Feature Catalog API
// ============================================================================

export type FeatureKindSlug =
  | 'block' | 'item' | 'tool' | 'armor' | 'food' | 'enchantment'
  | 'entity' | 'geckolib_animation'
  | 'biome' | 'dimension' | 'worldgen_feature'
  | 'recipe' | 'loot_table' | 'advancement'
  | 'sound' | 'texture' | 'model'
  | 'config' | 'keybind' | 'screen' | 'command'
  | 'event_handler' | 'mixin' | 'jei_integration' | 'dependency_integration';

export type CompletionStatus = 'skeleton' | 'partial' | 'complete';

export interface FeatureInfo {
  kind: FeatureKindSlug;
  name: string;
  description: string;
  category: string;

  status: CompletionStatus;

  supported_loaders: string[];
  supported_mc_versions: string[];

  has_template: boolean;
  has_validator: boolean;
  has_dependency_resolver: boolean;
  has_version_aware_generator: boolean;

  command_name: string | null;
  editor_panel_id: string | null;
  notes: string;
}

export const listFeatures = (): Promise<FeatureInfo[]> => invoke<FeatureInfo[]>('list_features');

export const generateFeatureSkeleton = (data: {
  project_id: number;
  kind: FeatureKindSlug;
  name: string;
}): Promise<GeneratedFile> => invoke<GeneratedFile>('generate_feature_skeleton', data);

// ============================================================================
// Recipe API
// ============================================================================

export interface TauriRecipe {
  id: number | null;
  project_id: number;
  recipe_name: string;
  recipe_type: string;
  output_item_id: number | null;
  output_block_id: number | null;
  output_count: number;
  cook_time: number | null;
  experience: number;
  pattern_json: string | null;
  ingredients_json: string;
}

export type CreateRecipeInput = Omit<TauriRecipe, 'id'>;
export type UpdateRecipeInput = TauriRecipe & { id: number };

export const createRecipe = (data: CreateRecipeInput): Promise<number> =>
  invoke<number>('create_recipe', data);

export const updateRecipe = (data: UpdateRecipeInput): Promise<void> =>
  invoke<void>('update_recipe', data);

export const deleteRecipe = (id: number): Promise<void> =>
  invoke<void>('delete_recipe', { id });

export const getRecipe = (id: number): Promise<TauriRecipe | null> =>
  invoke<TauriRecipe | null>('get_recipe', { id });

export const getRecipes = (project_id: number): Promise<TauriRecipe[]> =>
  invoke<TauriRecipe[]>('get_recipes', { project_id });

export const generateRecipeJson = (recipe_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_recipe_json', { recipe_id });

// ============================================================================
// World-data API (Entity / Biome / Dimension / Advancement)
// ============================================================================

export interface RegistryAsset {
  id: number | null;
  project_id: number;
  asset_type: string;
  asset_name: string;
  namespace: string;
  display_name: string | null;
  file_path: string | null;
  metadata: string | null;
}

export const saveAsset = (data: {
  id?: number;
  project_id: number;
  asset_type: string;
  asset_name: string;
  namespace: string;
  display_name?: string;
  metadata?: string;
}): Promise<number> => invoke<number>('save_asset', data);

export const deleteAsset = (id: number): Promise<void> =>
  invoke<void>('delete_asset', { id });

export const getAsset = (id: number): Promise<RegistryAsset | null> =>
  invoke<RegistryAsset | null>('get_asset', { id });

export const getAssets = (
  project_id: number,
  asset_type: string
): Promise<RegistryAsset[]> =>
  invoke<RegistryAsset[]>('get_assets', { project_id, asset_type });

export const generateEntityClass = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_entity_class', { asset_id });

export const generateBiomeJson = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_biome_json', { asset_id });

export const generateDimensionJson = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_dimension_json', { asset_id });

export const generateAdvancementJson = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_advancement_json', { asset_id });

export const generateEnchantmentClass = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_enchantment_class', { asset_id });

// ============================================================================
// Worldgen Feature codegen (PR #27)
// ============================================================================
//
// Unlike the other generators, a worldgen feature ships as a *bundle* of
// 3 files: configured_feature.json + placed_feature.json + a biome
// modifier (Forge / NeoForge JSON, or a Fabric BiomeModifications Java
// helper). The command therefore returns Vec<GeneratedFile>; the
// frontend modal renders one tab per file and the "Write to project"
// button writes them all.

export type WorldgenKind = 'ore' | 'scattered_ore' | 'tree' | 'lake' | 'spring' | 'disk';

export interface WorldgenMeta {
  kind: WorldgenKind;
  /** Block to place. Required for ore / scattered_ore / disk. */
  target_block?: string;
  /** Tag or block id to replace. Defaults to `#minecraft:stone_ore_replaceables`. */
  replace_target?: string;
  /** 1..=64. */
  vein_size?: number;
  /** 0..=1. */
  discard_chance_on_air_exposure?: number;
  /** Attempts per chunk. 1..=128. */
  count?: number;
  min_y?: number;
  max_y?: number;
  /** 1 in N chunks; 0 disables. */
  rarity?: number;
  /** `#tag` or block id Forge/NeoForge biome_modifier should target. */
  biome_tag?: string;
  /** e.g. "underground_ores" / "vegetal_decoration" / "lakes". */
  generation_step?: string;
  /** Tree-only. */
  trunk_block?: string;
  leaves_block?: string;
  trunk_height?: number;
  foliage_radius?: number;
  /** Lake / Spring fluid. */
  fluid?: string;
  /** Disk-only. */
  disk_radius?: number;
}

export const generateWorldgenFeature = (
  asset_id: number
): Promise<GeneratedFile[]> =>
  invoke<GeneratedFile[]>('generate_worldgen_feature', { asset_id });

// ============================================================================
// Loot Table codegen (PR #28)
// ============================================================================

export type LootKind = 'block' | 'entity' | 'chest' | 'fishing' | 'gift' | 'generic';

export type RollsMeta =
  | number
  | {
      min: number;
      max: number;
      range_type?: 'uniform' | 'binomial' | 'constant';
    };

export interface LootEntryMeta {
  entry_type: 'item' | 'tag' | 'loot_table' | 'empty' | 'dynamic' | 'alternatives' | 'group' | 'sequence';
  /** Required for item / tag / loot_table / dynamic. */
  name?: string;
  weight?: number;
  quality?: number;
  count?: RollsMeta;
  conditions?: unknown[];
  functions?: unknown[];
  /** Required for alternatives / group / sequence. */
  children?: LootEntryMeta[];
}

export interface LootPoolMeta {
  rolls: RollsMeta;
  bonus_rolls?: RollsMeta;
  entries: LootEntryMeta[];
  conditions?: unknown[];
}

export interface LootTableMeta {
  kind: LootKind;
  pools: LootPoolMeta[];
}

export const generateLootTableJson = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_loot_table_json', { asset_id });

// ============================================================================
// Sound / Keybind / Config codegen (PR #29)
// ============================================================================

export type SoundCategory =
  | 'master' | 'music' | 'record' | 'weather' | 'block' | 'hostile'
  | 'neutral' | 'player' | 'ambient' | 'voice';

export interface SoundEventMeta {
  /** Snake-case registry id. */
  name: string;
  category?: SoundCategory;
  subtitle?: string;
  /** Each entry is either a string id ("modid:foo") or an object form
   *  ({name, volume, pitch, weight, stream}) — passed through verbatim. */
  sounds: Array<string | Record<string, unknown>>;
}

export interface SoundMeta {
  events: SoundEventMeta[];
}

/** Generates the SoundEvents Java class **and** sounds.json fragment. */
export const generateSoundAssets = (asset_id: number): Promise<GeneratedFile[]> =>
  invoke<GeneratedFile[]>('generate_sound_assets', { asset_id });

export interface KeybindMeta {
  /** Snake-case action id; becomes `key.<modid>.<action_id>` translation key. */
  action_id: string;
  display_name?: string;
  /** GLFW key — single letter/digit ("K", "9") or named ("F4", "SPACE",
   *  "LEFT_SHIFT"). Strict server-side validation against a known list. */
  default_key?: string;
  /** "key.categories.misc" / "key.categories.gameplay" / custom. */
  category?: string;
}

export const generateKeybindClass = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_keybind_class', { asset_id });

export type ConfigFieldType = 'bool' | 'int' | 'double' | 'string' | 'enum';

export interface ConfigFieldMeta {
  name: string;
  field_type: ConfigFieldType;
  default_value: unknown;
  min?: number;
  max?: number;
  comment?: string;
  /** Required for `field_type === 'enum'`. */
  allowed_values?: string[];
}

export interface ConfigMeta {
  /** "common" / "client" / "server" — controls Forge ModConfig.Type. */
  kind: 'common' | 'client' | 'server';
  /** Optional class name override; defaults to PascalCase(asset_name). */
  class_name?: string;
  fields: ConfigFieldMeta[];
}

export const generateConfigClass = (asset_id: number): Promise<GeneratedFile> =>
  invoke<GeneratedFile>('generate_config_class', { asset_id });

// ============================================================================
// Item-variant codegen
// ============================================================================
//
// As of PR #26 every parameter except `item_id` is optional: the Rust
// side falls back to the persisted Item row's PR #24 columns
// (tool_kind, tool_tier, armor_material, armor_slot, food_*) and only
// uses the explicit args when they're sent. The TypeScript shapes
// below mirror that — keep `item_id` required, mark the rest optional.

export type ToolKind = 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'sword';
export type ArmorSlotKind = 'head' | 'chest' | 'legs' | 'feet';
export type ToolTier = 'WOOD' | 'STONE' | 'IRON' | 'GOLD' | 'DIAMOND' | 'NETHERITE';

export interface ToolOverrides {
  kind?: ToolKind;
  tier?: ToolTier;
  attack_damage_bonus?: number;
  attack_speed_modifier?: number;
}

export const generateToolClass = (data: {
  item_id: number;
  kind?: ToolKind;
  tier?: ToolTier;
  attack_damage_bonus?: number;
  attack_speed_modifier?: number;
  overrides?: ToolOverrides;
}): Promise<GeneratedFile> => invoke<GeneratedFile>('generate_tool_class', data);

export interface ArmorOverrides {
  slot?: ArmorSlotKind;
  armor_material_const?: string;
}

export const generateArmorClass = (data: {
  item_id: number;
  slot?: ArmorSlotKind;
  armor_material_const?: string;
  overrides?: ArmorOverrides;
}): Promise<GeneratedFile> => invoke<GeneratedFile>('generate_armor_class', data);

export interface FoodOverrides {
  nutrition?: number;
  saturation_modifier?: number;
  always_eat?: boolean;
  can_eat_when_full?: boolean;
  eat_seconds?: number;
}

export const generateFoodClass = (data: {
  item_id: number;
  nutrition?: number;
  saturation_modifier?: number;
  always_eat?: boolean;
  can_eat_when_full?: boolean;
  overrides?: FoodOverrides;
}): Promise<GeneratedFile> => invoke<GeneratedFile>('generate_food_class', data);

// ============================================================================
// Dependency Resolver API
// ============================================================================

export interface DependencyCoordinate {
  mc_version: string;
  loader: string;
  group: string;
  artifact: string;
  version: string;
  maven_url: string;
}

export interface DependencyInfo {
  id: string;
  display_name: string;
  description: string;
  homepage: string;
  supported_loaders: string[];
  coordinates: DependencyCoordinate[];
}

export interface ResolvedDependency {
  dependency: DependencyInfo;
  matched: DependencyCoordinate | null;
  gradle_snippet: string;
}

export const listDependencies = (): Promise<DependencyInfo[]> =>
  invoke<DependencyInfo[]>('list_dependencies');

export const resolveDependency = (data: {
  id: string;
  mc_version: string;
  loader: string;
}): Promise<ResolvedDependency> => invoke<ResolvedDependency>('resolve_dependency', data);

// ============================================================================
// Mod / Modpack importer
// ============================================================================

export interface ModDependency {
  mod_id: string;
  version_range: string;
  mandatory: boolean;
}

export interface FeatureCounts {
  blocks: number;
  items: number;
  blockstates: number;
  models_block: number;
  models_item: number;
  textures_block: number;
  textures_item: number;
  textures_entity: number;
  recipes: number;
  loot_tables: number;
  advancements: number;
  structures: number;
  biomes: number;
  dimensions: number;
  worldgen_features: number;
  tags: number;
  lang_files: number;
  sounds: number;
  mixins: number;
  jei_plugins: number;
}

export interface FeatureFiles {
  blockstates: string[];
  models_block: string[];
  models_item: string[];
  textures_block: string[];
  textures_item: string[];
  recipes: string[];
  loot_tables: string[];
  advancements: string[];
  lang_files: string[];
  other: string[];
}

export interface ImportedMod {
  mod_id: string;
  display_name: string;
  version: string;
  description: string;
  authors: string[];
  license: string;
  homepage: string;
  loader: string;
  minecraft_version_range: string;
  dependencies: ModDependency[];
  feature_counts: FeatureCounts;
  feature_files: FeatureFiles;
  java_packages: Record<string, number>;
  total_classes: number;
  total_assets: number;
  total_data_files: number;
  raw_size_bytes: number;
  warnings: string[];
}

export interface ModpackEntry {
  project_id: string;
  file_id: string;
  name: string;
  required: boolean;
  source: string;
}

export interface ImportedModpack {
  format: string;
  name: string;
  version: string;
  author: string;
  minecraft_version: string;
  loader: string;
  mod_count: number;
  mods: ModpackEntry[];
  override_files: string[];
  warnings: string[];
}

export type ImportArchiveResult =
  | { kind: 'mod'; Mod: ImportedMod }
  | { kind: 'modpack'; Modpack: ImportedModpack };

export const importModOrPack = (path: string): Promise<ImportArchiveResult> =>
  invoke<ImportArchiveResult>('import_mod_or_pack', { path });

export const extractJarFile = (data: {
  jar_path: string;
  internal_path: string;
  target_dir: string;
}): Promise<string> => invoke<string>('extract_jar_file', data);

// ============================================================================
// Vanilla+ template library
// ============================================================================

export type VariantKind =
  | 'slab' | 'stairs' | 'wall' | 'fence' | 'fence_gate'
  | 'button' | 'pressure_plate' | 'door' | 'trapdoor'
  | 'vertical_slab' | 'glowing_variant';

export interface VanillaPlusRequest {
  namespace: string;
  base_block_name: string;
  display_name: string;
  mc_version: string;
  loader: string;
  variants: VariantKind[];
}

export const generateVanillaPlusVariants = (
  request: VanillaPlusRequest
): Promise<GeneratedFile[]> =>
  invoke<GeneratedFile[]>('generate_vanilla_plus_variants', { request });

// ============================================================================
// Resource API
// ============================================================================

export const getResourceText = (path: string): Promise<string> =>
  invoke<string>('get_resource_text', { path });

export const listResources = (): Promise<string[]> => invoke<string[]>('list_resources');

// ============================================================================
// Event listeners
// ============================================================================

export async function listenToFsEvents(
  callback: (event: { event_type: string; file_path: string; file_type: string }) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<{ event_type: string; file_path: string; file_type: string }>(
    'fs-event',
    (e) => callback(e.payload)
  );
  return unlisten;
}

export async function listenToBuildStatus(
  callback: (status: string) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<string>('build-status', (e) => callback(e.payload));
  return unlisten;
}
