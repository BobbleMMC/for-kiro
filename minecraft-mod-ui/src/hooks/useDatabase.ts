/**
 * Database initialization hook
 * Handles database setup, seeding, and provides loading state
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../database/db';
import { seedDatabase } from '../database/seed';
import {
  ProjectService,
  BlockService,
  ItemService,
  EnchantmentService,
  RecipeService,
  EntityService,
} from '../database/services';
import { useProjectStore } from '../stores/projectStore';

interface DatabaseState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  isSeeding: boolean;
}

/**
 * Hook to initialize the database and load data into the store.
 * Call this once at the app root level.
 */
export function useDatabase() {
  const [state, setState] = useState<DatabaseState>({
    isReady: false,
    isLoading: true,
    error: null,
    isSeeding: false,
  });

  const store = useProjectStore();

  const loadDataIntoStore = useCallback(async () => {
    try {
      // Load all projects
      const projects = await ProjectService.getAll();
      
      // Set projects in store
      for (const project of projects) {
        store.addProject(project);
      }

      // If there's at least one project, set it as current and load its content
      if (projects.length > 0) {
        const currentProject = projects[0];
        store.setCurrentProject(currentProject);

        // Load project content
        const [blocks, items, recipes, entities] = await Promise.all([
          BlockService.getAll(currentProject.id),
          ItemService.getAll(currentProject.id),
          RecipeService.getAll(currentProject.id),
          EntityService.getAll(currentProject.id),
        ]);

        // Populate store
        for (const block of blocks) {
          store.addBlock(block);
        }
        for (const item of items) {
          store.addItem(item);
        }
        for (const recipe of recipes) {
          store.addRecipe(recipe);
        }
        for (const entity of entities) {
          store.addEntity(entity);
        }
      }
    } catch (error) {
      console.error('[DB] Failed to load data into store:', error);
      throw error;
    }
  }, [store]);

  const initDatabase = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Open database connection
      await db.open();
      console.log('[DB] Database connection opened');

      // Seed if needed
      setState(prev => ({ ...prev, isSeeding: true }));
      await seedDatabase();
      setState(prev => ({ ...prev, isSeeding: false }));

      // Load data into store
      await loadDataIntoStore();

      setState({
        isReady: true,
        isLoading: false,
        error: null,
        isSeeding: false,
      });

      console.log('[DB] Database initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      console.error('[DB] Database initialization failed:', error);
      setState({
        isReady: false,
        isLoading: false,
        error: errorMessage,
        isSeeding: false,
      });
    }
  }, [loadDataIntoStore]);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  /**
   * Reload all data from the database into the store
   */
  const refreshStore = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      // Clear current store data
      store.setCurrentProject(null);
      
      await loadDataIntoStore();
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, [store, loadDataIntoStore]);

  /**
   * Switch the active project and reload its content into the store
   */
  const switchProject = useCallback(async (projectId: number) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const project = await ProjectService.getById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      store.setCurrentProject(project);

      // Load project content
      const [blocks, items, recipes, entities] = await Promise.all([
        BlockService.getAll(projectId),
        ItemService.getAll(projectId),
        RecipeService.getAll(projectId),
        EntityService.getAll(projectId),
      ]);

      // Clear and repopulate store arrays
      // Note: We rebuild by setting fresh data
      const currentBlocks = useProjectStore.getState().blocks;
      const currentItems = useProjectStore.getState().items;
      const currentRecipes = useProjectStore.getState().recipes;
      const currentEntities = useProjectStore.getState().entities;

      // Remove old project data
      for (const block of currentBlocks) {
        store.deleteBlock(block.id);
      }
      for (const item of currentItems) {
        store.deleteItem(item.id);
      }
      for (const recipe of currentRecipes) {
        store.deleteRecipe(recipe.id);
      }
      for (const entity of currentEntities) {
        store.deleteEntity(entity.id);
      }

      // Add new project data
      for (const block of blocks) {
        store.addBlock(block);
      }
      for (const item of items) {
        store.addItem(item);
      }
      for (const recipe of recipes) {
        store.addRecipe(recipe);
      }
      for (const entity of entities) {
        store.addEntity(entity);
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch project';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, [store]);

  /**
   * Reset the database and re-seed
   */
  const resetAndReseed = useCallback(async () => {
    try {
      setState({ isReady: false, isLoading: true, error: null, isSeeding: true });

      // Delete and recreate
      await db.delete();
      await db.open();

      // Re-seed
      await seedDatabase();

      // Reload store
      await loadDataIntoStore();

      setState({ isReady: true, isLoading: false, error: null, isSeeding: false });
      console.log('[DB] Database reset and re-seeded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset database';
      setState({ isReady: false, isLoading: false, error: errorMessage, isSeeding: false });
    }
  }, [loadDataIntoStore]);

  return {
    ...state,
    refreshStore,
    switchProject,
    resetAndReseed,
  };
}

/**
 * Hook to use database services for a specific content type.
 * Provides async CRUD operations that sync with the store.
 */
export function useDatabaseSync() {
  const store = useProjectStore();

  const syncBlock = useCallback(async (blockId: number) => {
    const block = await BlockService.getById(blockId);
    if (block) {
      store.updateBlock(block);
    }
  }, [store]);

  const syncItem = useCallback(async (itemId: number) => {
    const item = await ItemService.getById(itemId);
    if (item) {
      store.updateItem(item);
    }
  }, [store]);

  const syncRecipe = useCallback(async (recipeId: number) => {
    const recipe = await RecipeService.getById(recipeId);
    if (recipe) {
      store.updateRecipe(recipe);
    }
  }, [store]);

  const syncEntity = useCallback(async (entityId: number) => {
    const entity = await EntityService.getById(entityId);
    if (entity) {
      store.updateEntity(entity);
    }
  }, [store]);

  const syncEnchantment = useCallback(async (_enchantmentId: number) => {
    // Enchantments don't have a store array yet, but keeping for future use
    await EnchantmentService.getById(_enchantmentId);
  }, []);

  return {
    syncBlock,
    syncItem,
    syncRecipe,
    syncEntity,
    syncEnchantment,
  };
}
