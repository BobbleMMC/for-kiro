/**
 * API Service for backend communication
 * Connects to Python FastAPI backend for data persistence
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

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000;

// API Error Handler
class APIError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Request wrapper with error handling
async function request<T>(
  method: string,
  endpoint: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new APIError(
        response.status,
        error.code || 'API_ERROR',
        error.message || `HTTP ${response.status}`,
        error.details
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new APIError(0, 'NETWORK_ERROR', 'Failed to connect to backend', error);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new APIError(408, 'TIMEOUT', 'Request timeout', error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


// Project API
export const projectAPI = {
  async getAll(): Promise<Project[]> {
    return request<Project[]>('GET', '/projects');
  },

  async getById(id: number): Promise<Project> {
    return request<Project>('GET', `/projects/${id}`);
  },

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'build_count' | 'is_archived'>): Promise<Project> {
    return request<Project>('POST', '/projects', project);
  },

  async update(id: number, project: Partial<Project>): Promise<Project> {
    return request<Project>('PATCH', `/projects/${id}`, project);
  },

  async delete(id: number): Promise<void> {
    await request<void>('DELETE', `/projects/${id}`);
  },

  async getStats(id: number) {
    return request<{ block_count: number; item_count: number; recipe_count: number; entity_count: number }>(
      'GET',
      `/projects/${id}/stats`
    );
  },

  async archive(id: number): Promise<Project> {
    return request<Project>('POST', `/projects/${id}/archive`);
  },

  async export(id: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}/export`, {
      method: 'GET',
      headers: { 'Accept': 'application/zip' },
    });
    if (!response.ok) {
      throw new APIError(response.status, 'EXPORT_ERROR', 'Failed to export project');
    }
    return response.blob();
  },
};

// Block API
export const blockAPI = {
  async getByProject(projectId: number): Promise<Block[]> {
    return request<Block[]>('GET', `/projects/${projectId}/blocks`);
  },

  async create(block: Omit<Block, 'id' | 'created_at' | 'updated_at'>): Promise<Block> {
    return request<Block>('POST', `/blocks`, block);
  },

  async update(id: number, block: Partial<Block>): Promise<Block> {
    return request<Block>('PATCH', `/blocks/${id}`, block);
  },

  async delete(id: number): Promise<void> {
    await request<void>('DELETE', `/blocks/${id}`);
  },

  async bulkCreate(blocks: Omit<Block, 'id' | 'created_at' | 'updated_at'>[]): Promise<Block[]> {
    return request<Block[]>('POST', `/blocks/bulk`, { items: blocks });
  },
};

// Item API
export const itemAPI = {
  async getByProject(projectId: number): Promise<Item[]> {
    return request<Item[]>('GET', `/projects/${projectId}/items`);
  },

  async create(item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> {
    return request<Item>('POST', `/items`, item);
  },

  async update(id: number, item: Partial<Item>): Promise<Item> {
    return request<Item>('PATCH', `/items/${id}`, item);
  },

  async delete(id: number): Promise<void> {
    await request<void>('DELETE', `/items/${id}`);
  },

  async bulkCreate(items: Omit<Item, 'id' | 'created_at' | 'updated_at'>[]): Promise<Item[]> {
    return request<Item[]>('POST', `/items/bulk`, { items });
  },
};

// Recipe API
export const recipeAPI = {
  async getByProject(projectId: number): Promise<Recipe[]> {
    return request<Recipe[]>('GET', `/projects/${projectId}/recipes`);
  },

  async create(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe> {
    return request<Recipe>('POST', `/recipes`, recipe);
  },

  async update(id: number, recipe: Partial<Recipe>): Promise<Recipe> {
    return request<Recipe>('PATCH', `/recipes/${id}`, recipe);
  },

  async delete(id: number): Promise<void> {
    await request<void>('DELETE', `/recipes/${id}`);
  },

  async validate(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<{ valid: boolean; errors: string[] }> {
    return request('POST', `/recipes/validate`, recipe);
  },
};

// Entity API
export const entityAPI = {
  async getByProject(projectId: number): Promise<EntityType[]> {
    return request<EntityType[]>('GET', `/projects/${projectId}/entities`);
  },

  async create(entity: Omit<EntityType, 'id' | 'created_at' | 'updated_at'>): Promise<EntityType> {
    return request<EntityType>('POST', `/entities`, entity);
  },

  async update(id: number, entity: Partial<EntityType>): Promise<EntityType> {
    return request<EntityType>('PATCH', `/entities/${id}`, entity);
  },

  async delete(id: number): Promise<void> {
    await request<void>('DELETE', `/entities/${id}`);
  },
};

// Build API
export const buildAPI = {
  async getByProject(projectId: number): Promise<BuildLog[]> {
    return request<BuildLog[]>('GET', `/projects/${projectId}/builds`);
  },

  async create(build: Omit<BuildLog, 'id' | 'created_at'>): Promise<BuildLog> {
    return request<BuildLog>('POST', `/builds`, build);
  },

  async startBuild(projectId: number): Promise<{ buildNumber: number; buildId: number }> {
    return request('POST', `/projects/${projectId}/build-start`);
  },

  async stopBuild(buildId: number): Promise<void> {
    await request<void>('POST', `/builds/${buildId}/stop`);
  },

  async getBuildLogs(buildId: number): Promise<{ logs: string[] }> {
    return request('GET', `/builds/${buildId}/logs`);
  },
};

// Agent Task API
export const agentTaskAPI = {
  async getByProject(projectId: number): Promise<AgentTask[]> {
    return request<AgentTask[]>('GET', `/projects/${projectId}/tasks`);
  },

  async create(task: Omit<AgentTask, 'id' | 'created_at'>): Promise<AgentTask> {
    return request<AgentTask>('POST', `/tasks`, task);
  },

  async getPending(): Promise<AgentTask[]> {
    return request<AgentTask[]>('GET', `/tasks/pending`);
  },

  async updateStatus(
    id: number,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    output?: string,
    error?: string
  ): Promise<AgentTask> {
    return request<AgentTask>('PATCH', `/tasks/${id}`, { status, output, error });
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

export { APIError };
