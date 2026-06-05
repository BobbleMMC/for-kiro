import React, { useState, useRef } from 'react';
import { Upload, Trash2, Eye, Download, Grid3x3 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface Texture {
  id: string;
  name: string;
  path: string;
  type: 'block' | 'item' | 'entity' | 'environment' | 'ui';
  size: number;
  preview?: string;
  uploadedAt: string;
}

interface TextureSelectorProps {
  onTextureSelect?: (texture: Texture) => void;
  onTexturesChange?: (textures: Texture[]) => void;
}

export const TextureSelector: React.FC<TextureSelectorProps> = ({
  onTextureSelect,
  onTexturesChange,
}) => {
  const [textures, setTextures] = useState<Texture[]>([]);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [filterType, setFilterType] = useState<Texture['type'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newTextures: Texture[] = files.map((file) => ({
      id: `texture_${Date.now()}_${Math.random()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      path: `textures/${file.name}`,
      type: 'block',
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));

    const updated = [...textures, ...newTextures];
    setTextures(updated);
    onTexturesChange?.(updated);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveTexture = (id: string) => {
    const updated = textures.filter(t => t.id !== id);
    setTextures(updated);
    onTexturesChange?.(updated);
    if (selectedTexture?.id === id) {
      setSelectedTexture(null);
    }
  };

  const handleSelectTexture = (texture: Texture) => {
    setSelectedTexture(texture);
    onTextureSelect?.(texture);
  };

  const handleChangeType = (textureId: string, newType: Texture['type']) => {
    const updated = textures.map(t =>
      t.id === textureId ? { ...t, type: newType } : t
    );
    setTextures(updated);
    onTexturesChange?.(updated);
    if (selectedTexture?.id === textureId) {
      setSelectedTexture({ ...selectedTexture, type: newType });
    }
  };

  const filteredTextures = textures.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const textureStats = {
    total: textures.length,
    block: textures.filter(t => t.type === 'block').length,
    item: textures.filter(t => t.type === 'item').length,
    entity: textures.filter(t => t.type === 'entity').length,
    ui: textures.filter(t => t.type === 'ui').length,
  };

  const getTotalSize = () => {
    const bytes = textures.reduce((sum, t) => sum + t.size, 0);
    return (bytes / 1024).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6 border-2 border-dashed border-blue-300 dark:border-blue-600">
        <div className="flex flex-col items-center justify-center">
          <Upload size={40} className="text-blue-500 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Upload Textures</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
            Drag and drop texture files or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="mb-3"
          >
            <Upload size={16} className="mr-2" />
            Choose Files
          </Button>
          <p className="text-xs text-gray-500">
            Supported formats: PNG, JPG, GIF (Max 10MB per file)
          </p>
        </div>
      </Card>

      {/* Statistics */}
      <Card className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
        <h4 className="font-semibold mb-3">Texture Statistics</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
            <p className="text-2xl font-bold">{textureStats.total}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Size</p>
            <p className="text-2xl font-bold">{getTotalSize()} KB</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Types</p>
            <p className="text-sm">
              B:{textureStats.block} I:{textureStats.item} E:{textureStats.entity}
            </p>
          </div>
        </div>
      </Card>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by texture name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Type</label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'block', 'item', 'entity', 'environment', 'ui'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    filterType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Texture Grid */}
      {filteredTextures.length > 0 ? (
        <Card className="p-4">
          <h4 className="font-semibold mb-4 flex items-center">
            <Grid3x3 size={18} className="mr-2" />
            Textures ({filteredTextures.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredTextures.map((texture) => (
              <div
                key={texture.id}
                onClick={() => handleSelectTexture(texture)}
                className={`p-3 rounded-md border-2 cursor-pointer transition ${
                  selectedTexture?.id === texture.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400'
                }`}
              >
                <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-center justify-center">
                  <Grid3x3 size={32} className="text-gray-400" />
                </div>
                <p className="text-xs font-semibold truncate">{texture.name}</p>
                <p className="text-xs text-gray-500 mb-2">{(texture.size / 1024).toFixed(1)} KB</p>
                <select
                  value={texture.type}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleChangeType(texture.id, e.target.value as Texture['type']);
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="block">Block</option>
                  <option value="item">Item</option>
                  <option value="entity">Entity</option>
                  <option value="environment">Environment</option>
                  <option value="ui">UI</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      ) : textures.length > 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No textures match your filters</p>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No textures uploaded yet</p>
        </Card>
      )}

      {/* Selected Texture Details */}
      {selectedTexture && (
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <h4 className="font-semibold mb-4 flex items-center">
            <Eye size={18} className="mr-2" />
            Selected Texture Details
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Name</p>
              <p className="font-semibold">{selectedTexture.name}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Type</p>
              <p className="font-semibold">{selectedTexture.type}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Path</p>
              <p className="font-mono text-xs">{selectedTexture.path}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Size</p>
              <p className="font-semibold">{(selectedTexture.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const element = document.createElement('a');
                element.href = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
                element.download = `${selectedTexture.name}.png`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              size="sm"
              variant="outline"
            >
              <Download size={14} className="mr-1" />
              Download
            </Button>
            <Button
              onClick={() => handleRemoveTexture(selectedTexture.id)}
              size="sm"
              variant="outline"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 size={14} className="mr-1" />
              Delete
            </Button>
          </div>
        </Card>
      )}

      {/* Texture Organization Info */}
      <Card className="p-4 bg-gray-50 dark:bg-gray-800">
        <h4 className="font-semibold mb-2">📁 Recommended Folder Structure</h4>
        <div className="text-xs font-mono space-y-1 text-gray-600 dark:text-gray-400">
          <p>assets/</p>
          <p>├── textures/</p>
          <p>│   ├── block/</p>
          <p>│   ├── item/</p>
          <p>│   └── entity/</p>
          <p>└── models/</p>
        </div>
      </Card>
    </div>
  );
};
