import { useState, type FC } from 'react';
import { Plus, Trash2, Globe, Sun, Moon, Layers } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface DimensionBiomeSource {
  type: 'multi_noise' | 'fixed' | 'checkerboard' | 'the_end';
  biomes: DimensionBiomeEntry[];
  seed?: number;
}

export interface DimensionBiomeEntry {
  id: string;
  biome: string;
  parameters?: {
    temperature: [number, number];
    humidity: [number, number];
    continentalness: [number, number];
    erosion: [number, number];
    depth: [number, number];
    weirdness: [number, number];
    offset: number;
  };
}

export interface NoiseSettings {
  seaLevel: number;
  minY: number;
  height: number;
  defaultBlock: string;
  defaultFluid: string;
  oreVeins: boolean;
  aquifers: boolean;
  noiseCaves: boolean;
}

export interface DimensionType {
  ultrawarm: boolean;
  natural: boolean;
  piglinSafe: boolean;
  respawnAnchorWorks: boolean;
  bedWorks: boolean;
  hasRaids: boolean;
  hasSkylight: boolean;
  hasCeiling: boolean;
  fixedTime?: number;
  ambientLight: number;
  logicalHeight: number;
  infiniburn: string;
  minY: number;
  height: number;
  coordinateScale: number;
}

export interface Dimension {
  id: string;
  name: string;
  description: string;
  dimensionType: DimensionType;
  biomeSource: DimensionBiomeSource;
  noiseSettings: NoiseSettings;
  skyColor: string;
  fogColor: string;
  portalType: 'nether' | 'end' | 'custom' | 'none';
}

interface DimensionEditorProps {
  onSave?: (dimension: Dimension) => void;
}

export const DimensionEditor: FC<DimensionEditorProps> = ({ onSave }) => {
  const [dimension, setDimension] = useState<Dimension>({
    id: `dimension_${Date.now()}`,
    name: 'custom_dimension',
    description: 'A custom dimension',
    dimensionType: {
      ultrawarm: false,
      natural: true,
      piglinSafe: false,
      respawnAnchorWorks: false,
      bedWorks: true,
      hasRaids: true,
      hasSkylight: true,
      hasCeiling: false,
      ambientLight: 0.0,
      logicalHeight: 384,
      infiniburn: '#minecraft:infiniburn_overworld',
      minY: -64,
      height: 384,
      coordinateScale: 1.0,
    },
    biomeSource: {
      type: 'multi_noise',
      biomes: [
        {
          id: 'biome_1',
          biome: 'minecraft:plains',
          parameters: {
            temperature: [-1, 1],
            humidity: [-1, 1],
            continentalness: [-1, 1],
            erosion: [-1, 1],
            depth: [0, 1],
            weirdness: [-1, 1],
            offset: 0,
          },
        },
      ],
    },
    noiseSettings: {
      seaLevel: 63,
      minY: -64,
      height: 384,
      defaultBlock: 'minecraft:stone',
      defaultFluid: 'minecraft:water',
      oreVeins: true,
      aquifers: true,
      noiseCaves: true,
    },
    skyColor: '#78a7ff',
    fogColor: '#c0d8ff',
    portalType: 'custom',
  });

  const updateDimensionType = (updates: Partial<DimensionType>) => {
    setDimension({
      ...dimension,
      dimensionType: { ...dimension.dimensionType, ...updates },
    });
  };

  const updateNoiseSettings = (updates: Partial<NoiseSettings>) => {
    setDimension({
      ...dimension,
      noiseSettings: { ...dimension.noiseSettings, ...updates },
    });
  };

  const updateBiomeSource = (updates: Partial<DimensionBiomeSource>) => {
    setDimension({
      ...dimension,
      biomeSource: { ...dimension.biomeSource, ...updates },
    });
  };

  const handleAddBiome = () => {
    updateBiomeSource({
      biomes: [
        ...dimension.biomeSource.biomes,
        {
          id: `biome_${Date.now()}`,
          biome: 'minecraft:forest',
          parameters: {
            temperature: [-0.5, 0.5],
            humidity: [-0.5, 0.5],
            continentalness: [0, 1],
            erosion: [-1, 1],
            depth: [0, 1],
            weirdness: [-1, 1],
            offset: 0,
          },
        },
      ],
    });
  };

  const handleRemoveBiome = (id: string) => {
    updateBiomeSource({
      biomes: dimension.biomeSource.biomes.filter(b => b.id !== id),
    });
  };

  const handleUpdateBiome = (id: string, biome: string) => {
    updateBiomeSource({
      biomes: dimension.biomeSource.biomes.map(b =>
        b.id === id ? { ...b, biome } : b
      ),
    });
  };

  const handleSave = () => {
    if (!dimension.name.trim()) {
      alert('Please enter dimension name');
      return;
    }
    onSave?.(dimension);
  };

  const getPresetDimension = (preset: 'overworld' | 'nether' | 'end') => {
    switch (preset) {
      case 'overworld':
        setDimension({
          ...dimension,
          dimensionType: {
            ...dimension.dimensionType,
            natural: true,
            hasSkylight: true,
            hasCeiling: false,
            ultrawarm: false,
            bedWorks: true,
            hasRaids: true,
            ambientLight: 0,
            logicalHeight: 384,
            minY: -64,
            height: 384,
            coordinateScale: 1.0,
          },
          noiseSettings: {
            ...dimension.noiseSettings,
            seaLevel: 63,
            minY: -64,
            height: 384,
          },
          skyColor: '#78a7ff',
          fogColor: '#c0d8ff',
        });
        break;
      case 'nether':
        setDimension({
          ...dimension,
          dimensionType: {
            ...dimension.dimensionType,
            natural: false,
            hasSkylight: false,
            hasCeiling: true,
            ultrawarm: true,
            bedWorks: false,
            hasRaids: false,
            fixedTime: 18000,
            ambientLight: 0.1,
            logicalHeight: 128,
            minY: 0,
            height: 256,
            coordinateScale: 8.0,
          },
          noiseSettings: {
            ...dimension.noiseSettings,
            seaLevel: 32,
            minY: 0,
            height: 128,
            defaultBlock: 'minecraft:netherrack',
            defaultFluid: 'minecraft:lava',
          },
          skyColor: '#330808',
          fogColor: '#330707',
        });
        break;
      case 'end':
        setDimension({
          ...dimension,
          dimensionType: {
            ...dimension.dimensionType,
            natural: false,
            hasSkylight: false,
            hasCeiling: false,
            ultrawarm: false,
            bedWorks: false,
            hasRaids: true,
            fixedTime: 6000,
            ambientLight: 0,
            logicalHeight: 256,
            minY: 0,
            height: 256,
            coordinateScale: 1.0,
          },
          noiseSettings: {
            ...dimension.noiseSettings,
            seaLevel: 0,
            minY: 0,
            height: 256,
            defaultBlock: 'minecraft:end_stone',
            defaultFluid: 'minecraft:air',
          },
          skyColor: '#000000',
          fogColor: '#0b080c',
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe size={20} className="mr-2" />
          Dimension Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Dimension Name</label>
            <input
              type="text"
              value={dimension.name}
              onChange={(e) => setDimension({ ...dimension, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono"
              placeholder="custom_dimension"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Portal Type</label>
            <select
              value={dimension.portalType}
              onChange={(e) => setDimension({ ...dimension, portalType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="custom">Custom Portal</option>
              <option value="nether">Nether Portal Style</option>
              <option value="end">End Portal Style</option>
              <option value="none">No Portal</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={dimension.description}
            onChange={(e) => setDimension({ ...dimension, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={2}
          />
        </div>
      </Card>

      {/* Presets */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
        <h3 className="text-lg font-semibold mb-4">Quick Presets</h3>
        <div className="flex gap-3">
          <Button onClick={() => getPresetDimension('overworld')} size="sm" variant="outline">
            <Sun size={16} className="mr-2" />
            Overworld-like
          </Button>
          <Button onClick={() => getPresetDimension('nether')} size="sm" variant="outline">
            <Moon size={16} className="mr-2 text-red-500" />
            Nether-like
          </Button>
          <Button onClick={() => getPresetDimension('end')} size="sm" variant="outline">
            <Globe size={16} className="mr-2 text-purple-500" />
            End-like
          </Button>
        </div>
      </Card>

      {/* Dimension Type Properties */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dimension Type Properties</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.natural} onChange={(e) => updateDimensionType({ natural: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Natural</strong> - Compass works</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.hasSkylight} onChange={(e) => updateDimensionType({ hasSkylight: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Has Skylight</strong></span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.hasCeiling} onChange={(e) => updateDimensionType({ hasCeiling: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Has Ceiling</strong></span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.ultrawarm} onChange={(e) => updateDimensionType({ ultrawarm: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Ultrawarm</strong> - Water evaporates</span>
            </label>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.bedWorks} onChange={(e) => updateDimensionType({ bedWorks: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Bed Works</strong></span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.respawnAnchorWorks} onChange={(e) => updateDimensionType({ respawnAnchorWorks: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Respawn Anchor</strong></span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.hasRaids} onChange={(e) => updateDimensionType({ hasRaids: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Has Raids</strong></span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dimension.dimensionType.piglinSafe} onChange={(e) => updateDimensionType({ piglinSafe: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm"><strong>Piglin Safe</strong></span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ambient Light</label>
            <input
              type="number"
              value={dimension.dimensionType.ambientLight}
              onChange={(e) => updateDimensionType({ ambientLight: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="0" max="1" step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Logical Height</label>
            <input
              type="number"
              value={dimension.dimensionType.logicalHeight}
              onChange={(e) => updateDimensionType({ logicalHeight: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="16" max="4064" step="16"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Coordinate Scale</label>
            <input
              type="number"
              value={dimension.dimensionType.coordinateScale}
              onChange={(e) => updateDimensionType({ coordinateScale: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="0.01" max="100" step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Y</label>
            <input
              type="number"
              value={dimension.dimensionType.minY}
              onChange={(e) => updateDimensionType({ minY: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="-2032" max="2031" step="16"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Height</label>
            <input
              type="number"
              value={dimension.dimensionType.height}
              onChange={(e) => updateDimensionType({ height: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="16" max="4064" step="16"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fixed Time</label>
            <input
              type="number"
              value={dimension.dimensionType.fixedTime ?? ''}
              onChange={(e) => updateDimensionType({ fixedTime: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="None"
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="0" max="24000"
            />
          </div>
        </div>
      </Card>

      {/* Noise Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Layers size={20} className="mr-2" />
          Noise & Generation Settings
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sea Level</label>
            <input
              type="number"
              value={dimension.noiseSettings.seaLevel}
              onChange={(e) => updateNoiseSettings({ seaLevel: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
              min="-64" max="320"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Block</label>
            <input
              type="text"
              value={dimension.noiseSettings.defaultBlock}
              onChange={(e) => updateNoiseSettings({ defaultBlock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
              placeholder="minecraft:stone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Fluid</label>
            <input
              type="text"
              value={dimension.noiseSettings.defaultFluid}
              onChange={(e) => updateNoiseSettings({ defaultFluid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
              placeholder="minecraft:water"
            />
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={dimension.noiseSettings.oreVeins} onChange={(e) => updateNoiseSettings({ oreVeins: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm"><strong>Ore Veins</strong> - Generate ore veins</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={dimension.noiseSettings.aquifers} onChange={(e) => updateNoiseSettings({ aquifers: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm"><strong>Aquifers</strong> - Generate underground water</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={dimension.noiseSettings.noiseCaves} onChange={(e) => updateNoiseSettings({ noiseCaves: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm"><strong>Noise Caves</strong> - Generate caves with noise</span>
          </label>
        </div>
      </Card>

      {/* Sky & Fog */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Sun size={20} className="mr-2" />
          Sky & Atmosphere
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sky Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={dimension.skyColor}
                onChange={(e) => setDimension({ ...dimension, skyColor: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={dimension.skyColor}
                onChange={(e) => setDimension({ ...dimension, skyColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fog Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={dimension.fogColor}
                onChange={(e) => setDimension({ ...dimension, fogColor: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={dimension.fogColor}
                onChange={(e) => setDimension({ ...dimension, fogColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div
            className="h-20 rounded-lg border-2 border-gray-300 dark:border-gray-600"
            style={{ background: `linear-gradient(180deg, ${dimension.skyColor} 0%, ${dimension.fogColor} 100%)` }}
          />
          <p className="text-xs text-gray-500 mt-2 text-center">Sky preview (top: sky, bottom: fog)</p>
        </div>
      </Card>

      {/* Biome Source */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Biome Source</h3>
          <div className="flex gap-2">
            <select
              value={dimension.biomeSource.type}
              onChange={(e) => updateBiomeSource({ type: e.target.value as any })}
              className="px-3 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
            >
              <option value="multi_noise">Multi Noise</option>
              <option value="fixed">Fixed</option>
              <option value="checkerboard">Checkerboard</option>
              <option value="the_end">The End</option>
            </select>
            <Button onClick={handleAddBiome} size="sm">
              <Plus size={16} className="mr-2" />
              Add Biome
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {dimension.biomeSource.biomes.map((entry) => (
            <div key={entry.id} className="p-3 border border-gray-300 dark:border-gray-600 rounded-md">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={entry.biome}
                  onChange={(e) => handleUpdateBiome(entry.id, e.target.value)}
                  placeholder="minecraft:biome_name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                />
                {dimension.biomeSource.biomes.length > 1 && (
                  <button
                    onClick={() => handleRemoveBiome(entry.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <h3 className="text-lg font-semibold mb-4">Dimension Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p><strong>Name:</strong> {dimension.name}</p>
            <p><strong>Height:</strong> {dimension.dimensionType.minY} to {dimension.dimensionType.minY + dimension.dimensionType.height}</p>
            <p><strong>Sea Level:</strong> {dimension.noiseSettings.seaLevel}</p>
            <p><strong>Coordinate Scale:</strong> {dimension.dimensionType.coordinateScale}x</p>
            <p><strong>Biomes:</strong> {dimension.biomeSource.biomes.length}</p>
          </div>
          <div className="space-y-1">
            <p><strong>Skylight:</strong> {dimension.dimensionType.hasSkylight ? '✅' : '❌'}</p>
            <p><strong>Ceiling:</strong> {dimension.dimensionType.hasCeiling ? '✅' : '❌'}</p>
            <p><strong>Ultrawarm:</strong> {dimension.dimensionType.ultrawarm ? '✅' : '❌'}</p>
            <p><strong>Beds:</strong> {dimension.dimensionType.bedWorks ? '✅' : '❌'}</p>
            <p><strong>Portal:</strong> {dimension.portalType}</p>
          </div>
        </div>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} className="w-full">
        Save Dimension
      </Button>
    </div>
  );
};
