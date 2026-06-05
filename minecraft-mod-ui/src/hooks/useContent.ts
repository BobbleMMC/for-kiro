import { useProjectStore } from '../stores/projectStore';
import type { Block, Item, Recipe } from '../types';

/**
 * Hook for content (blocks, items, recipes) operations
 */
export const useContent = () => {
  const {
    blocks,
    items,
    recipes,
    addBlock,
    updateBlock,
    deleteBlock,
    addItem,
    updateItem,
    deleteItem,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  } = useProjectStore();

  const getProjectBlocks = (projectId: number) => {
    return blocks.filter(b => b.project_id === projectId);
  };

  const getProjectItems = (projectId: number) => {
    return items.filter(i => i.project_id === projectId);
  };

  const getProjectRecipes = (projectId: number) => {
    return recipes.filter(r => r.project_id === projectId);
  };

  const createBlock = (projectId: number, blockData: Omit<Block, 'id' | 'project_id' | 'created_at' | 'updated_at'>) => {
    const newBlock: Block = {
      id: blocks.length + 1,
      project_id: projectId,
      ...blockData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addBlock(newBlock);
    return newBlock;
  };

  const createItem = (projectId: number, itemData: Omit<Item, 'id' | 'project_id' | 'created_at' | 'updated_at'>) => {
    const newItem: Item = {
      id: items.length + 1,
      project_id: projectId,
      ...itemData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addItem(newItem);
    return newItem;
  };

  const createRecipe = (projectId: number, recipeData: Omit<Recipe, 'id' | 'project_id' | 'created_at' | 'updated_at'>) => {
    const newRecipe: Recipe = {
      id: recipes.length + 1,
      project_id: projectId,
      ...recipeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addRecipe(newRecipe);
    return newRecipe;
  };

  const removeBlock = (id: number) => {
    deleteBlock(id);
  };

  const removeItem = (id: number) => {
    deleteItem(id);
  };

  const removeRecipe = (id: number) => {
    deleteRecipe(id);
  };

  return {
    blocks,
    items,
    recipes,
    getProjectBlocks,
    getProjectItems,
    getProjectRecipes,
    createBlock,
    createItem,
    createRecipe,
    updateBlock,
    updateItem,
    updateRecipe,
    removeBlock,
    removeItem,
    removeRecipe,
  };
};
