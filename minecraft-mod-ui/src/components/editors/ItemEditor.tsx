import type { FC } from 'react';
import { useState } from 'react';
import { Save, X, Zap } from 'lucide-react';
import { Button } from '../common';
import type { Item } from '../../types';

interface ItemEditorProps {
  item?: Item;
  projectId: number;
  onSave: (item: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

const ItemEditor: FC<ItemEditorProps> = ({ item, projectId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    item_name: item?.item_name || '',
    display_name: item?.display_name || '',
    namespace: item?.namespace || '',
    max_stack_size: item?.max_stack_size || 64,
    rarity: item?.rarity || 'common' as const,
    is_enchantable: item?.is_enchantable || true,
    is_consumable: item?.is_consumable || false,
    food_nutrition: item?.food_nutrition || undefined,
    food_saturation: item?.food_saturation || undefined,
    is_weapon: item?.is_weapon || false,
    is_armor: item?.is_armor || false,
    is_tool: item?.is_tool || false,
    durability: item?.durability || undefined,
    attack_damage: item?.attack_damage || undefined,
    attack_speed: item?.attack_speed || 4.0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      project_id: projectId,
      ...formData,
      texture_path: item?.texture_path,
      custom_model_data: item?.custom_model_data,
    } as any);
  };

  const itemType = formData.is_weapon ? 'weapon' : formData.is_armor ? 'armor' : formData.is_tool ? 'tool' : 'item';

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 p-6">
        {/* Basic Properties */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Basic Properties</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="custom_sword"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="Custom Sword"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Namespace
                </label>
                <input
                  type="text"
                  value={formData.namespace}
                  onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="mymod"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rarity
                </label>
                <select
                  value={formData.rarity}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  {rarities.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stack Settings */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Stack Settings</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Max Stack Size
            </label>
            <input
              type="number"
              min="1"
              max="64"
              value={formData.max_stack_size}
              onChange={(e) => setFormData({ ...formData, max_stack_size: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Item Type Selection */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Item Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
              style={{ borderColor: !formData.is_weapon && !formData.is_armor && !formData.is_tool ? '#667eea' : undefined }}>
              <input
                type="radio"
                checked={!formData.is_weapon && !formData.is_armor && !formData.is_tool}
                onChange={() => setFormData({ ...formData, is_weapon: false, is_armor: false, is_tool: false })}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Regular Item</span>
            </label>
            <label className="flex items-center gap-2 p-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
              style={{ borderColor: formData.is_weapon ? '#667eea' : undefined }}>
              <input
                type="radio"
                checked={formData.is_weapon}
                onChange={() => setFormData({ ...formData, is_weapon: true, is_armor: false, is_tool: false })}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Weapon</span>
            </label>
            <label className="flex items-center gap-2 p-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
              style={{ borderColor: formData.is_armor ? '#667eea' : undefined }}>
              <input
                type="radio"
                checked={formData.is_armor}
                onChange={() => setFormData({ ...formData, is_weapon: false, is_armor: true, is_tool: false })}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Armor</span>
            </label>
            <label className="flex items-center gap-2 p-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
              style={{ borderColor: formData.is_tool ? '#667eea' : undefined }}>
              <input
                type="radio"
                checked={formData.is_tool}
                onChange={() => setFormData({ ...formData, is_weapon: false, is_armor: false, is_tool: true })}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tool</span>
            </label>
          </div>
        </div>

        {/* Weapon/Tool Properties */}
        {(formData.is_weapon || formData.is_tool) && (
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Combat Stats
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Attack Damage
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.attack_damage || 0}
                  onChange={(e) => setFormData({ ...formData, attack_damage: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Attack Speed
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.attack_speed}
                  onChange={(e) => setFormData({ ...formData, attack_speed: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Durability
                </label>
                <input
                  type="number"
                  value={formData.durability || 0}
                  onChange={(e) => setFormData({ ...formData, durability: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Consumable Properties */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={formData.is_consumable}
              onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Is Consumable (Food Item)</span>
          </label>

          {formData.is_consumable && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nutrition
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.food_nutrition || 0}
                  onChange={(e) => setFormData({ ...formData, food_nutrition: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Saturation
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.food_saturation || 0}
                  onChange={(e) => setFormData({ ...formData, food_saturation: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Item Flags */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Item Flags</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_enchantable}
              onChange={(e: any) => setFormData({ ...formData, is_enchantable: e.target.checked })}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Is Enchantable</span>
          </label>
        </div>

        {/* Preview */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Item Preview</h3>
          <div className="flex items-center justify-center bg-white dark:bg-slate-600 rounded-lg p-8 h-32">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded flex items-center justify-center mb-2 mx-auto">
                <span className="text-white font-bold text-xs">{itemType[0].toUpperCase()}</span>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{formData.display_name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {itemType} • Stack: {formData.max_stack_size}
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} icon={<X className="w-4 h-4" />}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} icon={<Save className="w-4 h-4" />}>
          Save Item
        </Button>
      </div>
    </div>
  );
};

export default ItemEditor;
