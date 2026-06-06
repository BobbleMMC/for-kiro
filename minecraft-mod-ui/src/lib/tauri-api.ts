/**
 * Tauri API Bridge
 * Provides type-safe wrappers for Rust backend commands
 * Falls back to mock data when running in browser (dev without Tauri)
 */

// Check if we're running inside Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Dynamic import for Tauri API (only available in Tauri context)
const invoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke<T>(command, args);
  }
  throw new Error(`Tauri not available. Command: ${command}`);
};

// ==================== Project API ====================

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

export async function createProject(data: {
  name: string;
  description?: string;
  minecraft_version: string;
  mod_loader: string;
  author: string;
  namespace: string;
}): Promise<number> {
  return invoke<number>('create_project', data);
}

export async function getProjects(): Promise<TauriProject[]> {
  return invoke<TauriProject[]>('get_projects');
}

export async function getProject(id: number): Promise<TauriProject | null> {
  return invoke<TauriProject | null>('get_project', { id });
}

export async function deleteProject(id: number): Promise<void> {
  return invoke<void>('delete_project', { id });
}

// ==================== Block API ====================

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

export async function createBlock(data: {
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
  texture_all?: string;
}): Promise<number> {
  return invoke<number>('create_block', data);
}

export async function getBlocks(project_id: number): Promise<TauriBlock[]> {
  return invoke<TauriBlock[]>('get_blocks', { project_id });
}

// ==================== Item API ====================

export async function createItem(data: {
  project_id: number;
  item_name: string;
  display_name: string;
  namespace: string;
  max_stack_size: number;
  rarity: string;
  is_enchantable: boolean;
  durability?: number;
  attack_damage?: number;
  texture_path?: string;
}): Promise<number> {
  return invoke<number>('create_item', data);
}

// ==================== Visual Graph API ====================

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

export async function saveVisualGraph(data: {
  id?: number;
  project_id: number;
  graph_name: string;
  graph_type: string;
  nodes_json: string;
  edges_json: string;
  viewport_json: string;
}): Promise<number> {
  return invoke<number>('save_visual_graph', data);
}

export async function getVisualGraphs(project_id: number): Promise<TauriVisualGraph[]> {
  return invoke<TauriVisualGraph[]>('get_visual_graphs', { project_id });
}

// ==================== Build API ====================

export interface BuildOutput {
  status: string;
  output: string;
  errors: string[];
  build_time_ms: number;
}

export async function runGradleBuild(project_path: string): Promise<BuildOutput> {
  return invoke<BuildOutput>('run_gradle_build', { project_path });
}

export async function checkJavaVersion(): Promise<string> {
  return invoke<string>('check_java_version');
}

// ==================== Event Listeners ====================

export async function listenToFsEvents(callback: (event: {
  event_type: string;
  file_path: string;
  file_type: string;
}) => void): Promise<() => void> {
  if (isTauri()) {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<{
      event_type: string;
      file_path: string;
      file_type: string;
    }>('fs-event', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}

export async function listenToBuildStatus(callback: (status: string) => void): Promise<() => void> {
  if (isTauri()) {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<string>('build-status', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
  return () => {};
}

// ==================== Utility ====================

export { isTauri };
