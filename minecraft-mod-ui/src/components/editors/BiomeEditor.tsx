import React, { useState } from 'react';
import { Plus, Trash2, Droplet, Zap } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface BiomeSpawner {
  id: string;
  entityType: string;
  weight: number;
  minGroupSize: number;
  maxGroupSize: number;
  category: 'creature' | 'monster' | 'ambient' | 'water_creature' | 'water_ambient';
}

export interface BiomeEffects {
  skyColor: string;
  waterColor: string;
  waterFogColor: string;
  fogColor: string;
  grassColorModifier?: 'none' | 'swamp' | 'dark_forest';
  foliageColorModifier?: 'none' | 'swamp' | 'birch' | 'dark_forest';
}

export interface Biome {
  id: string;
  name: string;
  description: string;
  temperature: number;
  downfall: number;
  precipitation: 'none' | 'rain' | 'snow';
  effects: BiomeEffects;
  spawners: BiomeSpawner[];
  scale: number;
  depth: number;
  humidity: number;
  category: string;
}

interface BiomeEditorProps {
  onSave?: (biome: Biome) => void;
}

export const BiomeEditor: React.FC<BiomeEditorProps> = ({ onSave }) => {
  const [biome, setBiome] = useState<Biome>({
    id: `biome_${Date.now()}`,
    name: '',
    description: '',
    temperature: 0.5,
    downfall: 0.5,
    precipitation: 'rain',
    effects: {
      skyColor: '#78a7ff',
      waterColor: '#3f76e4',
      waterFogColor: '#050533',
      fogColor: '#c0d8ff',
    },
    spawners: [],
    scale: 0.5,
    depth: 0.1,
    humidity: 0.5,
    category: 'temperate',
  });

  const handleAddSpawner = () => {
    setBiome({
      ...biome,
      spawners: [
        ...biome.spawners,
        {
          id: `spawner_${Date.now()}`,
          entityType: '',
          weight: 10,
          minGroupSize: 1,
          maxGroupSize: 4,
          category: 'creature',
        },
      ],
    });
  };

  const handleRemoveSpawner = (id: string) => {
    setBiome({
      ...biome,
      spawners: biome.spawners.filter(s => s.id !== id),
    });
  };

  const handleUpdateSpawner = (id: string, field: keyof BiomeSpawner, value: any) => {
    setBiome({
      ...biome,
      spawners: biome.spawners.map(spawner =>
        spawner.id === id ? { ...spawner, [field]: value } : spawner
      ),
    });
  };

  const handleUpdateEffects = (field: keyof BiomeEffects, value: any) => {
    setBiome({
      ...biome,
      effects: { ...biome.effects, [field]: value },
    });
  };

  const handleSave = () => {
    if (!biome.name) {
      alert('Please enter biome name');
      return;
    }
    onSave?.(biome);
  };

  const getTemperatureColor = () => {
    if (biome.temperature > 1.5) return 'from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30';
    if (biome.temperature > 0.5) return 'from-yellow-100 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-900/30';
    if (biome.temperature > -0.5) return 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30';
    return 'from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30';
  };

  const getTemperatureLabel = () => {
    if (biome.temperature > 1.5) return '🔥 Hot Desert';
    if (biome.temperature > 0.5) return '☀️ Warm Temperate';
    if (biome.temperature > -0.5) return '🌤️ Temperate';
    return '❄️ Cold/Snowy';
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Biome Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Biome Name</label>
            <input
              type="text"
              value={biome.name}
              onChange={(e) => setBiome({ ...biome, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="e.g., crystalline_forest"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={biome.category}
              onChange={(e) => setBiome({ ...biome, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="temperate">Temperate</option>
              <option value="desert">Desert</option>
              <option value="jungle">Jungle</option>
              <option value="mountain">Mountain</option>
              <option value="ocean">Ocean</option>
              <option value="river">River</option>
              <option value="nether">Nether</option>
              <option value="end">The End</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={biome.description}
            onChange={(e) => setBiome({ ...biome, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={2}
            placeholder="Describe the biome..."
          />
        </div>
      </Card>

      {/* Climate Settings */}
      <Card className={`p-6 bg-gradient-to-r ${getTemperatureColor()}`}>
        <h3 className="text-lg font-semibold mb-4">Climate Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Temperature <span className="font-bold">{biome.temperature.toFixed(2)}</span> - {getTemperatureLabel()}
            </label>
            <input
              type="range"
              value={biome.temperature}
              onChange={(e) => setBiome({ ...biome, temperature: parseFloat(e.target.value) })}
              className="w-full"
              min="-2"
              max="2"
              step="0.1"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">-2 (Snow) to 2 (Desert)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Downfall <span className="font-bold">{biome.downfall.toFixed(2)}</span>
            </label>
            <input
              type="range"
              value={biome.downfall}
              onChange={(e) => setBiome({ ...biome, downfall: parseFloat(e.target.value) })}
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">0 (Dry) to 1 (Wet)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Precipitation</label>
            <select
              value={biome.precipitation}
              onChange={(e) => setBiome({ ...biome, precipitation: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="none">None</option>
              <option value="rain">Rain</option>
              <option value="snow">Snow</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Humidity</label>
            <input
              type="range"
              value={biome.humidity}
              onChange={(e) => setBiome({ ...biome, humidity: parseFloat(e.target.value) })}
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>
      </Card>

      {/* Terrain Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Terrain Settings</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Scale</label>
            <input
              type="number"
              value={biome.scale}
              onChange={(e) => setBiome({ ...biome, scale: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0.1"
              max="2"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Depth</label>
            <input
              type="number"
              value={biome.depth}
              onChange={(e) => setBiome({ ...biome, depth: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="-2"
              max="2"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Humidity</label>
            <input
              type="number"
              value={biome.humidity}
              onChange={(e) => setBiome({ ...biome, humidity: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>
      </Card>

      {/* Visual Effects */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Droplet size={20} className="mr-2" />
          Visual Effects & Colors
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sky Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={biome.effects.skyColor}
                onChange={(e) => handleUpdateEffects('skyColor', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={biome.effects.skyColor}
                onChange={(e) => handleUpdateEffects('skyColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                placeholder="#78a7ff"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Water Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={biome.effects.waterColor}
                onChange={(e) => handleUpdateEffects('waterColor', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={biome.effects.waterColor}
                onChange={(e) => handleUpdateEffects('waterColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                placeholder="#3f76e4"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Water Fog Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={biome.effects.waterFogColor}
                onChange={(e) => handleUpdateEffects('waterFogColor', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={biome.effects.waterFogColor}
                onChange={(e) => handleUpdateEffects('waterFogColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                placeholder="#050533"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fog Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={biome.effects.fogColor}
                onChange={(e) => handleUpdateEffects('fogColor', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={biome.effects.fogColor}
                onChange={(e) => handleUpdateEffects('fogColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                placeholder="#c0d8ff"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Grass Color Modifier</label>
            <select
              value={biome.effects.grassColorModifier || 'none'}
              onChange={(e) => handleUpdateEffects('grassColorModifier', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="none">None</option>
              <option value="swamp">Swamp</option>
              <option value="dark_forest">Dark Forest</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Foliage Color Modifier</label>
            <select
              value={biome.effects.foliageColorModifier || 'none'}
              onChange={(e) => handleUpdateEffects('foliageColorModifier', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="none">None</option>
              <option value="swamp">Swamp</option>
              <option value="birch">Birch</option>
              <option value="dark_forest">Dark Forest</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Entity Spawners */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap size={20} className="mr-2" />
            Entity Spawners
          </h3>
          <Button onClick={handleAddSpawner} size="sm">
            <Plus size={16} className="mr-2" />
            Add Spawner
          </Button>
        </div>
        <div className="space-y-3">
          {biome.spawners.map((spawner) => (
            <div key={spawner.id} className="p-4 border border-gray-300 dark:border-gray-600 rounded-md">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={spawner.entityType}
                  onChange={(e) => handleUpdateSpawner(spawner.id, 'entityType', e.target.value)}
                  placeholder="Entity type (e.g., minecraft:sheep)"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                />
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Weight</label>
                  <input
                    type="number"
                    value={spawner.weight}
                    onChange={(e) => handleUpdateSpawner(spawner.id, 'weight', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Category</label>
                  <select
                    value={spawner.category}
                    onChange={(e) => handleUpdateSpawner(spawner.id, 'category', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  >
                    <option value="creature">Creature</option>
                    <option value="monster">Monster</option>
                    <option value="ambient">Ambient</option>
                    <option value="water_creature">Water Creature</option>
                    <option value="water_ambient">Water Ambient</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Min Group</label>
                  <input
                    type="number"
                    value={spawner.minGroupSize}
                    onChange={(e) => handleUpdateSpawner(spawner.id, 'minGroupSize', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Max Group</label>
                  <input
                    type="number"
                    value={spawner.maxGroupSize}
                    onChange={(e) => handleUpdateSpawner(spawner.id, 'maxGroupSize', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="1"
                  />
                </div>
              </div>
              <button
                onClick={() => handleRemoveSpawner(spawner.id)}
                className="w-full p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm flex items-center justify-center"
              >
                <Trash2 size={16} className="mr-1" />
                Remove Spawner
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <h3 className="text-lg font-semibold mb-4">Biome Preview</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Name:</strong> {biome.name || 'Unnamed'}</p>
            <p><strong>Category:</strong> {biome.category}</p>
            <p><strong>Temperature:</strong> {biome.temperature.toFixed(2)}</p>
            <p><strong>Precipitation:</strong> {biome.precipitation}</p>
          </div>
          <div>
            <p><strong>Downfall:</strong> {biome.downfall.toFixed(2)}</p>
            <p><strong>Scale:</strong> {biome.scale.toFixed(2)}</p>
            <p><strong>Spawners:</strong> {biome.spawners.length}</p>
            <p><strong>Humidity:</strong> {biome.humidity.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <div
            className="flex-1 h-24 rounded-md border-2 border-gray-300 dark:border-gray-600"
            style={{
              background: `linear-gradient(135deg, ${biome.effects.skyColor} 0%, ${biome.effects.waterColor} 100%)`,
            }}
          />
        </div>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Biome
      </Button>
    </div>
  );
};
