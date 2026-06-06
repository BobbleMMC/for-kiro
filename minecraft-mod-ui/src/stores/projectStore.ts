/**
 * Zustand store for project state management
 */

import { create } from 'zustand';
import type { Project, Block, Item, Recipe, EntityType, ConsoleMessage, BuildLog, AgentTask } from '../types';

interface ProjectState {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: number) => void;

  // Blocks
  blocks: Block[];
  addBlock: (block: Block) => void;
  updateBlock: (block: Block) => void;
  deleteBlock: (id: number) => void;

  // Items
  items: Item[];
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: number) => void;

  // Recipes
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: number) => void;

  // Entities
  entities: EntityType[];
  addEntity: (entity: EntityType) => void;
  updateEntity: (entity: EntityType) => void;
  deleteEntity: (id: number) => void;

  // Console/Logs
  consoleLogs: ConsoleMessage[];
  addConsoleMessage: (message: ConsoleMessage) => void;
  clearConsole: () => void;

  // Build Logs
  buildLogs: BuildLog[];
  addBuildLog: (log: BuildLog) => void;

  // Agent Tasks
  agentTasks: AgentTask[];
  addAgentTask: (task: AgentTask) => void;
  updateAgentTask: (task: AgentTask) => void;

  // UI State
  selectedItemId: number | null;
  selectedItemType: 'block' | 'item' | 'recipe' | 'entity' | null;
  setSelectedItem: (id: number | null, type: 'block' | 'item' | 'recipe' | 'entity' | null) => void;

  // Filters
  contentFilter: string;
  setContentFilter: (filter: string) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Projects
  projects: [],
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (project) => set((state) => ({
    projects: state.projects.map(p => p.id === project.id ? project : p),
    currentProject: state.currentProject?.id === project.id ? project : state.currentProject
  })),
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id),
    currentProject: state.currentProject?.id === id ? null : state.currentProject
  })),

  // Blocks
  blocks: [],
  addBlock: (block) => set((state) => ({ blocks: [...state.blocks, block] })),
  updateBlock: (block) => set((state) => ({
    blocks: state.blocks.map(b => b.id === block.id ? block : b)
  })),
  deleteBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id)
  })),

  // Items
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (item) => set((state) => ({
    items: state.items.map(i => i.id === item.id ? item : i)
  })),
  deleteItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  // Recipes
  recipes: [],
  addRecipe: (recipe) => set((state) => ({ recipes: [...state.recipes, recipe] })),
  updateRecipe: (recipe) => set((state) => ({
    recipes: state.recipes.map(r => r.id === recipe.id ? recipe : r)
  })),
  deleteRecipe: (id) => set((state) => ({
    recipes: state.recipes.filter(r => r.id !== id)
  })),

  // Entities
  entities: [],
  addEntity: (entity) => set((state) => ({ entities: [...state.entities, entity] })),
  updateEntity: (entity) => set((state) => ({
    entities: state.entities.map(e => e.id === entity.id ? entity : e)
  })),
  deleteEntity: (id) => set((state) => ({
    entities: state.entities.filter(e => e.id !== id)
  })),

  // Console — capped to last 200 messages to prevent unbounded growth
  consoleLogs: [],
  addConsoleMessage: (message) => set((state) => {
    const next = state.consoleLogs.length >= 200
      ? [...state.consoleLogs.slice(-199), message]
      : [...state.consoleLogs, message];
    return { consoleLogs: next };
  }),
  clearConsole: () => set({ consoleLogs: [] }),

  // Build Logs — capped to last 50 (each can be a multi-MB Gradle log)
  buildLogs: [],
  addBuildLog: (log) => set((state) => {
    const next = state.buildLogs.length >= 50
      ? [...state.buildLogs.slice(-49), log]
      : [...state.buildLogs, log];
    return { buildLogs: next };
  }),

  // Agent Tasks — capped to last 100
  agentTasks: [],
  addAgentTask: (task) => set((state) => {
    const next = state.agentTasks.length >= 100
      ? [...state.agentTasks.slice(-99), task]
      : [...state.agentTasks, task];
    return { agentTasks: next };
  }),
  updateAgentTask: (task) => set((state) => ({
    agentTasks: state.agentTasks.map(t => t.id === task.id ? task : t)
  })),

  // UI State
  selectedItemId: null,
  selectedItemType: null,
  setSelectedItem: (id, type) => set({ selectedItemId: id, selectedItemType: type }),

  // Filters
  contentFilter: 'all',
  setContentFilter: (filter) => set({ contentFilter: filter }),

  // Loading state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
