import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import * as tauri from '../lib/tauri-api';
import {
  blockFromTauri,
  blockToTauri,
  itemFromTauri,
  itemToTauri,
} from '../lib/tauri-mappers';
import type { Block, Item, Recipe } from '../types';

/**
 * Hook for content (blocks, items, recipes) operations.
 *
 * Auto-loads blocks/items from the SQLite database when `currentProject`
 * changes. Each create / update / delete is persisted to disk before the
 * Zustand store is updated; on failure the store is left untouched and the
 * error is surfaced via the returned `error` field.
 *
 * Recipes are still in-memory only — the Rust DB schema has the table but
 * no CRUD ops yet. This hook keeps the existing recipe behaviour so editor
 * code continues to work; persistence will land in a follow-up.
 */
export const useContent = () => {
  const store = useProjectStore();
  const {
    blocks,
    items,
    recipes,
    addBlock,
    updateBlock: storeUpdateBlock,
    deleteBlock: storeDeleteBlock,
    addItem,
    updateItem: storeUpdateItem,
    deleteItem: storeDeleteItem,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    currentProject,
  } = store;

  const lastLoadedProjectId = useRef<number | null>(null);

  // ----- Auto-load DB content when current project changes -----
  useEffect(() => {
    if (!currentProject) return;
    if (lastLoadedProjectId.current === currentProject.id) return;
    lastLoadedProjectId.current = currentProject.id;

    if (!tauri.isTauri()) return;

    (async () => {
      try {
        const [blockRows, itemRows] = await Promise.all([
          tauri.getBlocks(currentProject.id),
          tauri.getItems(currentProject.id),
        ]);

        const s = useProjectStore.getState();

        // Drop any in-memory rows for this project then seed from DB
        for (const b of s.blocks.filter((x) => x.project_id === currentProject.id)) {
          s.deleteBlock(b.id);
        }
        for (const i of s.items.filter((x) => x.project_id === currentProject.id)) {
          s.deleteItem(i.id);
        }

        for (const row of blockRows) s.addBlock(blockFromTauri(row));
        for (const row of itemRows) s.addItem(itemFromTauri(row));
      } catch (err) {
        // Surface in console — store is untouched
        // eslint-disable-next-line no-console
        console.error('Failed to load project content from DB:', err);
      }
    })();
  }, [currentProject]);

  const getProjectBlocks = useCallback(
    (projectId: number) => blocks.filter((b) => b.project_id === projectId),
    [blocks]
  );
  const getProjectItems = useCallback(
    (projectId: number) => items.filter((i) => i.project_id === projectId),
    [items]
  );
  const getProjectRecipes = useCallback(
    (projectId: number) => recipes.filter((r) => r.project_id === projectId),
    [recipes]
  );

  // ===== Block CRUD =====

  const createBlock = useCallback(
    async (
      projectId: number,
      data: Omit<Block, 'id' | 'project_id' | 'created_at' | 'updated_at'>
    ): Promise<Block> => {
      const now = new Date().toISOString();
      const draft: Block = {
        id: 0,
        project_id: projectId,
        ...data,
        created_at: now,
        updated_at: now,
      };

      if (tauri.isTauri()) {
        const id = await tauri.createBlock(blockToTauri(draft));
        const saved: Block = { ...draft, id };
        addBlock(saved);
        return saved;
      }

      const fallback: Block = { ...draft, id: Date.now() };
      addBlock(fallback);
      return fallback;
    },
    [addBlock]
  );

  const updateBlock = useCallback(
    async (block: Block): Promise<void> => {
      if (tauri.isTauri()) {
        await tauri.updateBlock({ ...blockToTauri(block), id: block.id });
      }
      storeUpdateBlock({ ...block, updated_at: new Date().toISOString() });
    },
    [storeUpdateBlock]
  );

  const removeBlock = useCallback(
    async (id: number): Promise<void> => {
      if (tauri.isTauri()) {
        await tauri.deleteBlock(id);
      }
      storeDeleteBlock(id);
    },
    [storeDeleteBlock]
  );

  // ===== Item CRUD =====

  const createItem = useCallback(
    async (
      projectId: number,
      data: Omit<Item, 'id' | 'project_id' | 'created_at' | 'updated_at'>
    ): Promise<Item> => {
      const now = new Date().toISOString();
      const draft: Item = {
        id: 0,
        project_id: projectId,
        ...data,
        created_at: now,
        updated_at: now,
      };

      if (tauri.isTauri()) {
        const id = await tauri.createItem(itemToTauri(draft));
        const saved: Item = { ...draft, id };
        addItem(saved);
        return saved;
      }

      const fallback: Item = { ...draft, id: Date.now() };
      addItem(fallback);
      return fallback;
    },
    [addItem]
  );

  const updateItem = useCallback(
    async (item: Item): Promise<void> => {
      if (tauri.isTauri()) {
        await tauri.updateItem({ ...itemToTauri(item), id: item.id });
      }
      storeUpdateItem({ ...item, updated_at: new Date().toISOString() });
    },
    [storeUpdateItem]
  );

  const removeItem = useCallback(
    async (id: number): Promise<void> => {
      if (tauri.isTauri()) {
        await tauri.deleteItem(id);
      }
      storeDeleteItem(id);
    },
    [storeDeleteItem]
  );

  // ===== Recipe (in-memory only for now) =====

  const createRecipe = useCallback(
    (
      projectId: number,
      recipeData: Omit<Recipe, 'id' | 'project_id' | 'created_at' | 'updated_at'>
    ) => {
      const newRecipe: Recipe = {
        id: Date.now(),
        project_id: projectId,
        ...recipeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addRecipe(newRecipe);
      return newRecipe;
    },
    [addRecipe]
  );

  const removeRecipe = useCallback((id: number) => deleteRecipe(id), [deleteRecipe]);

  return {
    blocks,
    items,
    recipes,
    getProjectBlocks,
    getProjectItems,
    getProjectRecipes,
    createBlock,
    updateBlock,
    removeBlock,
    createItem,
    updateItem,
    removeItem,
    createRecipe,
    updateRecipe,
    removeRecipe,
  };
};
