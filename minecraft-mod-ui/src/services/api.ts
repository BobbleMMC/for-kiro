/**
 * API Service for backend communication
 * This will be connected to the Python database backend
 */

import type {
  Project,
  Block,
  Item,
  Recipe,
  EntityType,
  BuildLog,
  AgentTask,
} from '../types';

// Mock API endpoints - replace with actual backend URLs

// Project API
export const projectAPI = {
  async getAll(): Promise<Project[]> {
    return [];
  },

  async getById(_id: number): Promise<Project> {
    return {} as Project;
  },

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'build_count' | 'is_archived'>): Promise<Project> {
    return { ...project, id: 1, build_count: 0, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Project;
  },

  async update(_id: number, _project: Partial<Project>): Promise<Project> {
    return {} as Project;
  },

  async delete(_id: number): Promise<void> {},

  async getStats(_id: number) {
    return { block_count: 0, item_count: 0, recipe_count: 0, entity_count: 0 };
  },
};

// Block API
export const blockAPI = {
  async getByProject(_projectId: number): Promise<Block[]> {
    return [];
  },

  async create(block: Omit<Block, 'id' | 'created_at' | 'updated_at'>): Promise<Block> {
    return { ...block, id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Block;
  },

  async update(_id: number, _block: Partial<Block>): Promise<Block> {
    return {} as Block;
  },

  async delete(_id: number): Promise<void> {},
};

// Item API
export const itemAPI = {
  async getByProject(_projectId: number): Promise<Item[]> {
    return [];
  },

  async create(item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> {
    return { ...item, id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Item;
  },

  async update(_id: number, _item: Partial<Item>): Promise<Item> {
    return {} as Item;
  },

  async delete(_id: number): Promise<void> {},
};

// Recipe API
export const recipeAPI = {
  async getByProject(_projectId: number): Promise<Recipe[]> {
    return [];
  },

  async create(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe> {
    return { ...recipe, id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Recipe;
  },

  async update(_id: number, _recipe: Partial<Recipe>): Promise<Recipe> {
    return {} as Recipe;
  },

  async delete(_id: number): Promise<void> {},
};

// Entity API
export const entityAPI = {
  async getByProject(_projectId: number): Promise<EntityType[]> {
    return [];
  },

  async create(entity: Omit<EntityType, 'id' | 'created_at' | 'updated_at'>): Promise<EntityType> {
    return { ...entity, id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as EntityType;
  },

  async update(_id: number, _entity: Partial<EntityType>): Promise<EntityType> {
    return {} as EntityType;
  },

  async delete(_id: number): Promise<void> {},
};

// Build API
export const buildAPI = {
  async getByProject(_projectId: number): Promise<BuildLog[]> {
    return [];
  },

  async create(build: Omit<BuildLog, 'id' | 'created_at'>): Promise<BuildLog> {
    return { ...build, id: 1, created_at: new Date().toISOString() } as BuildLog;
  },

  async startBuild(_projectId: number): Promise<{ buildNumber: number }> {
    return { buildNumber: 1 };
  },
};

// Agent Task API
export const agentTaskAPI = {
  async getByProject(_projectId: number): Promise<AgentTask[]> {
    return [];
  },

  async create(task: Omit<AgentTask, 'id' | 'created_at'>): Promise<AgentTask> {
    return { ...task, id: 1, created_at: new Date().toISOString() } as AgentTask;
  },

  async getPending(): Promise<AgentTask[]> {
    return [];
  },

  async updateStatus(
    _id: number,
    _status: 'pending' | 'in_progress' | 'completed' | 'failed',
    _output?: string,
    _error?: string
  ): Promise<AgentTask> {
    return {} as AgentTask;
  },
};

// Export all APIs
export const apiClient = {
  projects: projectAPI,
  blocks: blockAPI,
  items: itemAPI,
  recipes: recipeAPI,
  entities: entityAPI,
  builds: buildAPI,
  tasks: agentTaskAPI,
};
