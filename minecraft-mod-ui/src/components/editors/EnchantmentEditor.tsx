import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface Enchantment {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  weight: number;
  minCost: number;
  maxCost: number;
  isTreasure: boolean;
  isCurse: boolean;
  canMergeInAnvil: boolean;
  applicableItems: string[];
}

interface EnchantmentEditorProps {
  onSave?: (enchantment: Enchantment) => void;
}

export const EnchantmentEditor: React.FC<EnchantmentEditorProps> = ({ onSave }) => {
  const [enchantment, setEnchantment] = useState<Enchantment>({
    id: `enchantment_${Date.now()}`,
    name: '',
    description: '',
    maxLevel: 3,
    weight: 10,
    minCost: 1,
    maxCost: 5,
    isTreasure: false,
    isCurse: false,
    canMergeInAnvil: true,
    applicableItems: ['sword', 'armor', 'tool'],
  });

  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem && !enchantment.applicableItems.includes(newItem)) {
      setEnchantment({
        ...enchantment,
        applicableItems: [...enchantment.applicableItems, newItem],
      });
      setNewItem('');
    }
  };

  const handleRemoveItem = (item: string) => {
    setEnchantment({
      ...enchantment,
      applicableItems: enchantment.applicableItems.filter(i => i !== item),
    });
  };

  const handleSave = () => {
    if (!enchantment.name) {
      alert('Please enter enchantment name');
      return;
    }
    onSave?.(enchantment);
  };

  const getEnchantmentColor = () => {
    if (enchantment.isCurse) return 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20';
    if (enchantment.isTreasure) return 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/20';
    return 'from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20';
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Enchantment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Enchantment Name</label>
            <input
              type="text"
              value={enchantment.name}
              onChange={(e) => setEnchantment({ ...enchantment, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="e.g., sharpness, protection"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Level</label>
            <input
              type="number"
              value={enchantment.maxLevel}
              onChange={(e) => setEnchantment({ ...enchantment, maxLevel: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
              max="10"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={enchantment.description}
            onChange={(e) => setEnchantment({ ...enchantment, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={2}
            placeholder="Describe what this enchantment does..."
          />
        </div>
      </Card>

      {/* Flags */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Enchantment Properties</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enchantment.isTreasure}
              onChange={(e) => setEnchantment({ ...enchantment, isTreasure: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Treasure Enchantment</strong> - Only found in loot
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enchantment.isCurse}
              onChange={(e) => setEnchantment({ ...enchantment, isCurse: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Curse</strong> - Negative effect for player
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enchantment.canMergeInAnvil}
              onChange={(e) => setEnchantment({ ...enchantment, canMergeInAnvil: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Can Merge in Anvil</strong> - Can be combined with same enchantment
            </span>
          </label>
        </div>
      </Card>

      {/* Cost & Weight */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Cost & Probability</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Weight (Probability)</label>
            <input
              type="number"
              value={enchantment.weight}
              onChange={(e) => setEnchantment({ ...enchantment, weight: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">Higher weight = more likely to appear</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Enchanting Cost</label>
            <input
              type="number"
              value={enchantment.minCost}
              onChange={(e) => setEnchantment({ ...enchantment, minCost: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Enchanting Cost</label>
            <input
              type="number"
              value={enchantment.maxCost}
              onChange={(e) => setEnchantment({ ...enchantment, maxCost: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
            />
          </div>
        </div>
      </Card>

      {/* Applicable Items */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Applicable Items</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
            placeholder="e.g., sword, armor, tool"
          />
          <Button onClick={handleAddItem} size="sm">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {enchantment.applicableItems.map((item) => (
            <div
              key={item}
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-2"
            >
              {item}
              <button
                onClick={() => handleRemoveItem(item)}
                className="hover:text-red-600 dark:hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card className={`p-6 bg-gradient-to-r ${getEnchantmentColor()}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Sparkles size={20} className="mr-2" />
              <h3 className="text-lg font-semibold">{enchantment.name || 'Unnamed Enchantment'}</h3>
            </div>
            {enchantment.description && (
              <p className="text-sm mb-3 italic">{enchantment.description}</p>
            )}
            <div className="text-sm space-y-1">
              <p><strong>Max Level:</strong> {enchantment.maxLevel}</p>
              <p><strong>Weight:</strong> {enchantment.weight}</p>
              <p><strong>Cost Range:</strong> {enchantment.minCost}-{enchantment.maxCost}</p>
              <p><strong>Items:</strong> {enchantment.applicableItems.join(', ')}</p>
            </div>
          </div>
          <div className="text-right">
            {enchantment.isCurse && (
              <span className="block px-2 py-1 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 rounded text-xs font-semibold mb-2">
                CURSE
              </span>
            )}
            {enchantment.isTreasure && (
              <span className="block px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded text-xs font-semibold mb-2">
                TREASURE
              </span>
            )}
            {enchantment.canMergeInAnvil && (
              <span className="block px-2 py-1 bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 rounded text-xs font-semibold">
                MERGEABLE
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Enchantment
      </Button>
    </div>
  );
};
