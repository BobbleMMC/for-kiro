import React, { useState } from 'react';
import { Package, Plus, Trash2, Settings, FileJson, Archive } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface ResourcePack {
  id: string;
  name: string;
  description: string;
  packFormat: number;
  icon?: string;
  resources: ResourceItem[];
  metadata: {
    author: string;
    version: string;
    compatible: string[];
  };
  createdAt: string;
}

export interface ResourceItem {
  id: string;
  path: string;
  type: 'texture' | 'model' | 'sound' | 'language' | 'font' | 'other';
  size: number;
}

interface ResourcePackManagerProps {
  onPackCreate?: (pack: ResourcePack) => void;
  onPackUpdate?: (pack: ResourcePack) => void;
  onPackDelete?: (packId: string) => void;
}

export const ResourcePackManager: React.FC<ResourcePackManagerProps> = ({
  onPackCreate,
  onPackUpdate,
  onPackDelete,
}) => {
  const [packs, setPacks] = useState<ResourcePack[]>([]);
  const [selectedPack, setSelectedPack] = useState<ResourcePack | null>(null);
  const [showNewPackForm, setShowNewPackForm] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackDesc, setNewPackDesc] = useState('');

  const handleCreatePack = () => {
    if (!newPackName.trim()) {
      alert('Please enter a pack name');
      return;
    }

    const newPack: ResourcePack = {
      id: `pack_${Date.now()}`,
      name: newPackName,
      description: newPackDesc,
      packFormat: 15,
      resources: [],
      metadata: {
        author: 'Mod Creator',
        version: '1.0.0',
        compatible: ['1.20', '1.20.1'],
      },
      createdAt: new Date().toISOString(),
    };

    setPacks([...packs, newPack]);
    setSelectedPack(newPack);
    onPackCreate?.(newPack);
    setShowNewPackForm(false);
    setNewPackName('');
    setNewPackDesc('');
  };

  const handleDeletePack = (packId: string) => {
    if (confirm('Are you sure you want to delete this resource pack?')) {
      setPacks(packs.filter(p => p.id !== packId));
      if (selectedPack?.id === packId) {
        setSelectedPack(null);
      }
      onPackDelete?.(packId);
    }
  };

  const handleAddResource = () => {
    if (!selectedPack) return;

    const updated = {
      ...selectedPack,
      resources: [
        ...selectedPack.resources,
        {
          id: `res_${Date.now()}`,
          path: '',
          type: 'texture' as const,
          size: 0,
        },
      ],
    };

    const updatedPacks = packs.map(p => (p.id === selectedPack.id ? updated : p));
    setPacks(updatedPacks);
    setSelectedPack(updated);
    onPackUpdate?.(updated);
  };

  const handleRemoveResource = (resourceId: string) => {
    if (!selectedPack) return;

    const updated = {
      ...selectedPack,
      resources: selectedPack.resources.filter(r => r.id !== resourceId),
    };

    const updatedPacks = packs.map(p => (p.id === selectedPack.id ? updated : p));
    setPacks(updatedPacks);
    setSelectedPack(updated);
    onPackUpdate?.(updated);
  };

  const handleUpdateResource = (resourceId: string, field: keyof ResourceItem, value: any) => {
    if (!selectedPack) return;

    const updated = {
      ...selectedPack,
      resources: selectedPack.resources.map(r =>
        r.id === resourceId ? { ...r, [field]: value } : r
      ),
    };

    const updatedPacks = packs.map(p => (p.id === selectedPack.id ? updated : p));
    setPacks(updatedPacks);
    setSelectedPack(updated);
    onPackUpdate?.(updated);
  };

  const handleUpdatePackMetadata = (field: keyof ResourcePack, value: any) => {
    if (!selectedPack) return;

    const updated = { ...selectedPack, [field]: value };
    const updatedPacks = packs.map(p => (p.id === selectedPack.id ? updated : p));
    setPacks(updatedPacks);
    setSelectedPack(updated);
    onPackUpdate?.(updated);
  };

  const getTotalSize = () => {
    if (!selectedPack) return '0';
    const bytes = selectedPack.resources.reduce((sum, r) => sum + r.size, 0);
    return (bytes / 1024).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Package size={28} className="mr-2" />
          Resource Pack Manager
        </h2>
      </div>

      {/* Pack List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Resource Packs</h3>
          <Button onClick={() => setShowNewPackForm(true)} size="sm">
            <Plus size={16} className="mr-2" />
            New Pack
          </Button>
        </div>

        {showNewPackForm && (
          <div className="mb-4 p-4 border border-blue-300 rounded-md bg-blue-50 dark:bg-blue-900/20">
            <h4 className="font-semibold mb-3">Create New Resource Pack</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
                placeholder="Pack name (e.g., Custom Textures)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              />
              <textarea
                value={newPackDesc}
                onChange={(e) => setNewPackDesc(e.target.value)}
                placeholder="Pack description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreatePack} size="sm">
                  Create
                </Button>
                <Button
                  onClick={() => setShowNewPackForm(false)}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {packs.length > 0 ? (
          <div className="space-y-2">
            {packs.map((pack) => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`p-4 rounded-md border-2 cursor-pointer transition ${
                  selectedPack?.id === pack.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{pack.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{pack.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Format: {pack.packFormat} | Resources: {pack.resources.length}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePack(pack.id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No resource packs created yet</p>
        )}
      </Card>

      {/* Pack Details */}
      {selectedPack && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings size={20} className="mr-2" />
            Pack Settings
          </h3>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pack Name</label>
                <input
                  type="text"
                  value={selectedPack.name}
                  onChange={(e) => handleUpdatePackMetadata('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Pack Format</label>
                <input
                  type="number"
                  value={selectedPack.packFormat}
                  onChange={(e) => handleUpdatePackMetadata('packFormat', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={selectedPack.description}
                onChange={(e) => handleUpdatePackMetadata('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                rows={2}
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Author</label>
                <input
                  type="text"
                  value={selectedPack.metadata.author}
                  onChange={(e) =>
                    handleUpdatePackMetadata('metadata', {
                      ...selectedPack.metadata,
                      author: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Version</label>
                <input
                  type="text"
                  value={selectedPack.metadata.version}
                  onChange={(e) =>
                    handleUpdatePackMetadata('metadata', {
                      ...selectedPack.metadata,
                      version: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            </div>

            {/* Compatible Versions */}
            <div>
              <label className="block text-sm font-medium mb-2">Compatible Versions</label>
              <input
                type="text"
                value={selectedPack.metadata.compatible.join(', ')}
                onChange={(e) =>
                  handleUpdatePackMetadata('metadata', {
                    ...selectedPack.metadata,
                    compatible: e.target.value.split(',').map(v => v.trim()),
                  })
                }
                placeholder="e.g., 1.20, 1.20.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Resources */}
      {selectedPack && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Archive size={20} className="mr-2" />
              Resources ({selectedPack.resources.length})
            </h3>
            <div className="text-sm text-gray-600">
              Total: {getTotalSize()} KB
            </div>
            <Button onClick={handleAddResource} size="sm">
              <Plus size={16} className="mr-2" />
              Add Resource
            </Button>
          </div>

          {selectedPack.resources.length > 0 ? (
            <div className="space-y-3">
              {selectedPack.resources.map((resource) => (
                <div key={resource.id} className="p-3 border border-gray-300 dark:border-gray-600 rounded-md">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <input
                      type="text"
                      value={resource.path}
                      onChange={(e) => handleUpdateResource(resource.id, 'path', e.target.value)}
                      placeholder="e.g., textures/block/stone.png"
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    />
                    <select
                      value={resource.type}
                      onChange={(e) => handleUpdateResource(resource.id, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                    >
                      <option value="texture">Texture</option>
                      <option value="model">Model</option>
                      <option value="sound">Sound</option>
                      <option value="language">Language</option>
                      <option value="font">Font</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      value={resource.size}
                      onChange={(e) => handleUpdateResource(resource.id, 'size', parseInt(e.target.value))}
                      placeholder="Size (bytes)"
                      className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveResource(resource.id)}
                    className="w-full p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm flex items-center justify-center"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No resources added yet</p>
          )}
        </Card>
      )}

      {/* mcmeta Template */}
      {selectedPack && (
        <Card className="p-6 bg-gray-50 dark:bg-gray-800">
          <h4 className="font-semibold mb-3 flex items-center">
            <FileJson size={18} className="mr-2" />
            pack.mcmeta Preview
          </h4>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
            <pre>{JSON.stringify({
              pack: {
                pack_format: selectedPack.packFormat,
                description: selectedPack.description,
              },
            }, null, 2)}</pre>
          </div>
        </Card>
      )}
    </div>
  );
};
