import React, { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface LootItem {
  id: string;
  name: string;
  minCount: number;
  maxCount: number;
  chance: number;
}

export interface Entity {
  id: string;
  name: string;
  type: 'hostile' | 'passive' | 'neutral' | 'boss';
  health: number;
  armor: number;
  armorToughness: number;
  attackDamage: number;
  attackSpeed: number;
  movementSpeed: number;
  knockbackResistance: number;
  spawnType: 'natural' | 'egg' | 'spawner';
  minGroupSize: number;
  maxGroupSize: number;
  lootDrops: LootItem[];
  description?: string;
}

interface EntityEditorProps {
  onSave?: (entity: Entity) => void;
}

export const EntityEditor: React.FC<EntityEditorProps> = ({ onSave }) => {
  const [entity, setEntity] = useState<Entity>({
    id: `entity_${Date.now()}`,
    name: '',
    type: 'neutral',
    health: 20,
    armor: 0,
    armorToughness: 0,
    attackDamage: 4,
    attackSpeed: 4,
    movementSpeed: 0.1,
    knockbackResistance: 0,
    spawnType: 'natural',
    minGroupSize: 1,
    maxGroupSize: 4,
    lootDrops: [],
    description: '',
  });

  const handleAddLoot = () => {
    setEntity({
      ...entity,
      lootDrops: [
        ...entity.lootDrops,
        {
          id: `loot_${Date.now()}`,
          name: '',
          minCount: 1,
          maxCount: 1,
          chance: 1.0,
        },
      ],
    });
  };

  const handleRemoveLoot = (id: string) => {
    setEntity({
      ...entity,
      lootDrops: entity.lootDrops.filter(loot => loot.id !== id),
    });
  };

  const handleUpdateLoot = (id: string, field: keyof LootItem, value: any) => {
    setEntity({
      ...entity,
      lootDrops: entity.lootDrops.map(loot =>
        loot.id === id ? { ...loot, [field]: value } : loot
      ),
    });
  };

  const handleSave = () => {
    if (!entity.name) {
      alert('Please enter entity name');
      return;
    }
    onSave?.(entity);
  };

  const getHealthColor = () => {
    if (entity.health > 50) return 'text-red-600';
    if (entity.health > 20) return 'text-orange-600';
    return 'text-green-600';
  };

  const getDamageColor = () => {
    if (entity.attackDamage > 8) return 'text-red-600';
    if (entity.attackDamage > 4) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Entity Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entity Name</label>
            <input
              type="text"
              value={entity.name}
              onChange={(e) => setEntity({ ...entity, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="e.g., custom_zombie"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Entity Type</label>
            <select
              value={entity.type}
              onChange={(e) => setEntity({ ...entity, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="hostile">Hostile</option>
              <option value="passive">Passive</option>
              <option value="neutral">Neutral</option>
              <option value="boss">Boss</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={entity.description}
            onChange={(e) => setEntity({ ...entity, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={2}
            placeholder="Entity description..."
          />
        </div>
      </Card>

      {/* Health & Defense */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Health & Defense</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Health <span className={`${getHealthColor()} font-semibold`}>({entity.health}❤️)</span>
            </label>
            <input
              type="number"
              value={entity.health}
              onChange={(e) => setEntity({ ...entity, health: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Armor</label>
            <input
              type="number"
              value={entity.armor}
              onChange={(e) => setEntity({ ...entity, armor: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              max="30"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Armor Toughness</label>
            <input
              type="number"
              value={entity.armorToughness}
              onChange={(e) => setEntity({ ...entity, armorToughness: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Knockback Resistance</label>
            <input
              type="number"
              value={entity.knockbackResistance}
              onChange={(e) => setEntity({ ...entity, knockbackResistance: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>
      </Card>

      {/* Combat Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap size={20} className="mr-2" />
          Combat Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Attack Damage <span className={`${getDamageColor()} font-semibold`}>({entity.attackDamage}⚔️)</span>
            </label>
            <input
              type="number"
              value={entity.attackDamage}
              onChange={(e) => setEntity({ ...entity, attackDamage: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Attack Speed</label>
            <input
              type="number"
              value={entity.attackSpeed}
              onChange={(e) => setEntity({ ...entity, attackSpeed: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </Card>

      {/* Movement & Behavior */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Movement & Behavior</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Movement Speed</label>
            <input
              type="number"
              value={entity.movementSpeed}
              onChange={(e) => setEntity({ ...entity, movementSpeed: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Spawn Type</label>
            <select
              value={entity.spawnType}
              onChange={(e) => setEntity({ ...entity, spawnType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="natural">Natural Spawn</option>
              <option value="egg">Spawn Egg</option>
              <option value="spawner">Spawner</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Group Size</label>
            <input
              type="number"
              value={entity.minGroupSize}
              onChange={(e) => setEntity({ ...entity, minGroupSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Group Size</label>
            <input
              type="number"
              value={entity.maxGroupSize}
              onChange={(e) => setEntity({ ...entity, maxGroupSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="1"
            />
          </div>
        </div>
      </Card>

      {/* Loot Drops */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Loot Drops</h3>
          <Button onClick={handleAddLoot} size="sm">
            <Plus size={16} className="mr-2" />
            Add Loot
          </Button>
        </div>
        <div className="space-y-3">
          {entity.lootDrops.map((loot) => (
            <div key={loot.id} className="p-3 border border-gray-300 dark:border-gray-600 rounded-md">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={loot.name}
                  onChange={(e) => handleUpdateLoot(loot.id, 'name', e.target.value)}
                  placeholder="Item name"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                />
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Min Count</label>
                  <input
                    type="number"
                    value={loot.minCount}
                    onChange={(e) => handleUpdateLoot(loot.id, 'minCount', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Max Count</label>
                  <input
                    type="number"
                    value={loot.maxCount}
                    onChange={(e) => handleUpdateLoot(loot.id, 'maxCount', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Drop Chance</label>
                  <input
                    type="number"
                    value={loot.chance}
                    onChange={(e) => handleUpdateLoot(loot.id, 'chance', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>
              <button
                onClick={() => handleRemoveLoot(loot.id)}
                className="w-full p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm flex items-center justify-center"
              >
                <Trash2 size={16} className="mr-1" />
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <h3 className="text-lg font-semibold mb-4">Entity Preview</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Name:</strong> {entity.name || 'Unnamed'}</p>
            <p><strong>Type:</strong> {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}</p>
            <p><strong>Health:</strong> {entity.health} ❤️</p>
            <p><strong>Attack Damage:</strong> {entity.attackDamage} ⚔️</p>
          </div>
          <div>
            <p><strong>Armor:</strong> {entity.armor}</p>
            <p><strong>Group Size:</strong> {entity.minGroupSize}-{entity.maxGroupSize}</p>
            <p><strong>Spawn Type:</strong> {entity.spawnType}</p>
            <p><strong>Loot Drops:</strong> {entity.lootDrops.length}</p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Entity
      </Button>
    </div>
  );
};
