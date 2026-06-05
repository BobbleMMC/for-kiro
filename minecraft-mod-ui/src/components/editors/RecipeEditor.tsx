import React, { useState } from 'react';
import { Plus, Trash2, Grid3x3 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface Ingredient {
  id: string;
  name: string;
  count: number;
}

interface RecipeEditorProps {
  onSave?: (recipe: Recipe) => void;
}

export interface Recipe {
  id: string;
  name: string;
  type: 'shaped' | 'shapeless' | 'smelting' | 'smoking' | 'blasting' | 'campfire';
  ingredients: Ingredient[];
  result: {
    name: string;
    count: number;
  };
  grid?: string[][];
  cookTime?: number;
  experience?: number;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ onSave }) => {
  const [recipe, setRecipe] = useState<Recipe>({
    id: `recipe_${Date.now()}`,
    name: '',
    type: 'shaped',
    ingredients: [],
    result: { name: '', count: 1 },
    grid: Array(3).fill(null).map(() => Array(3).fill('')),
    cookTime: 200,
    experience: 0,
  });

  const [selectedGridCell, setSelectedGridCell] = useState<[number, number] | null>(null);

  const handleAddIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, { id: `ing_${Date.now()}`, name: '', count: 1 }],
    });
  };

  const handleRemoveIngredient = (id: string) => {
    setRecipe({
      ...recipe,
      ingredients: recipe.ingredients.filter(ing => ing.id !== id),
    });
  };

  const handleUpdateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setRecipe({
      ...recipe,
      ingredients: recipe.ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: value } : ing
      ),
    });
  };

  const handleGridCellClick = (row: number, col: number) => {
    setSelectedGridCell([row, col]);
  };

  const handleSave = () => {
    if (!recipe.name || !recipe.result.name) {
      alert('Please fill in recipe name and result name');
      return;
    }
    onSave?.(recipe);
  };

  const isSmelting = ['smelting', 'smoking', 'blasting', 'campfire'].includes(recipe.type);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recipe Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Recipe Name</label>
            <input
              type="text"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="e.g., oak_planks"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Recipe Type</label>
            <select
              value={recipe.type}
              onChange={(e) => setRecipe({ ...recipe, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="shaped">Shaped Crafting</option>
              <option value="shapeless">Shapeless Crafting</option>
              <option value="smelting">Smelting</option>
              <option value="smoking">Smoking</option>
              <option value="blasting">Blasting</option>
              <option value="campfire">Campfire Cooking</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Ingredients */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ingredients</h3>
          <Button onClick={handleAddIngredient} size="sm">
            <Plus size={16} className="mr-2" />
            Add Ingredient
          </Button>
        </div>
        <div className="space-y-3">
          {recipe.ingredients.map((ing) => (
            <div key={ing.id} className="flex gap-2">
              <input
                type="text"
                value={ing.name}
                onChange={(e) => handleUpdateIngredient(ing.id, 'name', e.target.value)}
                placeholder="Item name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              />
              <input
                type="number"
                value={ing.count}
                onChange={(e) => handleUpdateIngredient(ing.id, 'count', parseInt(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                min="1"
              />
              <button
                onClick={() => handleRemoveIngredient(ing.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Crafting Grid (for shaped recipes) */}
      {recipe.type === 'shaped' && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Grid3x3 size={20} className="mr-2" />
            <h3 className="text-lg font-semibold">Crafting Grid</h3>
          </div>
          <div className="inline-block border-2 border-gray-300 dark:border-gray-600 p-2">
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {recipe.grid?.map((row, rowIdx) =>
                row.map((cell, colIdx) => (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => handleGridCellClick(rowIdx, colIdx)}
                    className={`w-12 h-12 border-2 rounded text-xs text-center flex items-center justify-center ${
                      selectedGridCell?.[0] === rowIdx && selectedGridCell?.[1] === colIdx
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {cell}
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Result */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recipe Result</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Result Item</label>
            <input
              type="text"
              value={recipe.result.name}
              onChange={(e) => setRecipe({ ...recipe, result: { ...recipe.result, name: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="e.g., oak_planks"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Count</label>
            <input
              type="number"
              value={recipe.result.count}
              onChange={(e) => setRecipe({ ...recipe, result: { ...recipe.result, count: parseInt(e.target.value) } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
            />
          </div>
        </div>
      </Card>

      {/* Smelting Options */}
      {isSmelting && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Smelting Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cook Time (ticks)</label>
              <input
                type="number"
                value={recipe.cookTime}
                onChange={(e) => setRecipe({ ...recipe, cookTime: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Experience</label>
              <input
                type="number"
                value={recipe.experience}
                onChange={(e) => setRecipe({ ...recipe, experience: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Preview */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="text-sm space-y-2">
          <p><strong>Name:</strong> {recipe.name || 'Unnamed'}</p>
          <p><strong>Type:</strong> {recipe.type}</p>
          <p><strong>Result:</strong> {recipe.result.count}x {recipe.result.name}</p>
          <p><strong>Ingredients:</strong> {recipe.ingredients.length}</p>
          {isSmelting && (
            <>
              <p><strong>Cook Time:</strong> {recipe.cookTime ?? 200} ticks ({((recipe.cookTime ?? 200) / 20).toFixed(1)}s)</p>
              <p><strong>Experience:</strong> {recipe.experience}</p>
            </>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Recipe
      </Button>
    </div>
  );
};
