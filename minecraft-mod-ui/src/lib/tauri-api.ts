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
}

export type CreateItemInput = Omit<TauriItem, 'id'>;
export type UpdateItemInput = TauriItem & { id: number };

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
