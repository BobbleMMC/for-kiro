import { useState, useRef, type FC } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Download, RefreshCw, Box, Layers } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface ModelFace {
  texture: string;
  uv: [number, number, number, number];
  rotation?: number;
  tintindex?: number;
}

export interface ModelElement {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  rotation?: {
    origin: [number, number, number];
    axis: 'x' | 'y' | 'z';
    angle: number;
  };
  faces: {
    north?: ModelFace;
    south?: ModelFace;
    east?: ModelFace;
    west?: ModelFace;
    up?: ModelFace;
    down?: ModelFace;
  };
}

export interface BlockModel {
  id: string;
  name: string;
  parent?: string;
  textures: Record<string, string>;
  elements: ModelElement[];
  ambientOcclusion?: boolean;
  display?: Record<string, { rotation: number[]; translation: number[]; scale: number[] }>;
}

interface ModelPreviewerProps {
  onModelChange?: (model: BlockModel) => void;
  onExport?: (json: string) => void;
}

export const ModelPreviewer: FC<ModelPreviewerProps> = ({ onModelChange, onExport }) => {
  const [model, setModel] = useState<BlockModel>({
    id: `model_${Date.now()}`,
    name: 'custom_block',
    parent: 'minecraft:block/cube_all',
    textures: {
      all: 'modid:block/custom_block',
      particle: 'modid:block/custom_block',
    },
    elements: [
      {
        id: 'element_1',
        from: [0, 0, 0],
        to: [16, 16, 16],
        faces: {
          north: { texture: '#all', uv: [0, 0, 16, 16] },
          south: { texture: '#all', uv: [0, 0, 16, 16] },
          east: { texture: '#all', uv: [0, 0, 16, 16] },
          west: { texture: '#all', uv: [0, 0, 16, 16] },
          up: { texture: '#all', uv: [0, 0, 16, 16] },
          down: { texture: '#all', uv: [0, 0, 16, 16] },
        },
      },
    ],
    ambientOcclusion: true,
  });

  const [rotation, setRotation] = useState({ x: -30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedElement, setSelectedElement] = useState<string | null>(model.elements[0]?.id || null);
  const [showWireframe, setShowWireframe] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotation({
      x: rotation.x + dy * 0.5,
      y: rotation.y + dx * 0.5,
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.3));
  const handleResetView = () => {
    setRotation({ x: -30, y: 45 });
    setZoom(1);
  };

  const handleAddElement = () => {
    const newElement: ModelElement = {
      id: `element_${Date.now()}`,
      from: [4, 0, 4],
      to: [12, 8, 12],
      faces: {
        north: { texture: '#all', uv: [0, 0, 16, 16] },
        south: { texture: '#all', uv: [0, 0, 16, 16] },
        east: { texture: '#all', uv: [0, 0, 16, 16] },
        west: { texture: '#all', uv: [0, 0, 16, 16] },
        up: { texture: '#all', uv: [0, 0, 16, 16] },
        down: { texture: '#all', uv: [0, 0, 16, 16] },
      },
    };
    const updated = { ...model, elements: [...model.elements, newElement] };
    setModel(updated);
    setSelectedElement(newElement.id);
    onModelChange?.(updated);
  };

  const handleRemoveElement = (id: string) => {
    const updated = { ...model, elements: model.elements.filter(e => e.id !== id) };
    setModel(updated);
    if (selectedElement === id) {
      setSelectedElement(updated.elements[0]?.id || null);
    }
    onModelChange?.(updated);
  };

  const handleUpdateElement = (id: string, field: string, value: any) => {
    const updated = {
      ...model,
      elements: model.elements.map(el =>
        el.id === id ? { ...el, [field]: value } : el
      ),
    };
    setModel(updated);
    onModelChange?.(updated);
  };

  const handleExportJson = () => {
    const exportData = {
      parent: model.parent,
      textures: model.textures,
      elements: model.elements.map(({ id, ...rest }) => rest),
      ambientocclusion: model.ambientOcclusion,
    };
    const json = JSON.stringify(exportData, null, 2);
    onExport?.(json);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateTexture = (key: string, value: string) => {
    const updated = { ...model, textures: { ...model.textures, [key]: value } };
    setModel(updated);
    onModelChange?.(updated);
  };

  const handleAddTexture = () => {
    const key = `texture_${Object.keys(model.textures).length}`;
    handleUpdateTexture(key, 'modid:block/new_texture');
  };

  const selectedEl = model.elements.find(e => e.id === selectedElement);

  // Isometric cube rendering
  const renderIsometricCube = (element: ModelElement, index: number) => {
    const [fx, fy, fz] = element.from;
    const [tx, ty, tz] = element.to;
    const width = (tx - fx) * zoom;
    const height = (ty - fy) * zoom;
    const depth = (tz - fz) * zoom;
    const isSelected = element.id === selectedElement;

    const topColor = isSelected ? '#60a5fa' : '#8bc34a';
    const leftColor = isSelected ? '#3b82f6' : '#689f38';
    const rightColor = isSelected ? '#2563eb' : '#558b2f';

    const centerX = 150;
    const centerY = 120;
    const scale = 4 * zoom;

    const ox = (fx - 8) * scale * Math.cos(Math.PI / 6);
    const oy = (fy - 8) * scale;

    return (
      <g key={element.id} onClick={() => setSelectedElement(element.id)} className="cursor-pointer">
        {/* Top face */}
        <polygon
          points={`
            ${centerX + ox},${centerY - oy - height * scale / 4}
            ${centerX + ox + width * scale / 3},${centerY - oy - height * scale / 4 - depth * scale / 6}
            ${centerX + ox + width * scale / 3 + depth * scale / 3},${centerY - oy - height * scale / 4}
            ${centerX + ox + depth * scale / 3},${centerY - oy - height * scale / 4 + depth * scale / 6}
          `}
          fill={topColor}
          stroke={showWireframe ? '#000' : 'none'}
          strokeWidth={showWireframe ? '1' : '0'}
          opacity={0.9}
        />
        {/* Left face */}
        <polygon
          points={`
            ${centerX + ox},${centerY - oy - height * scale / 4}
            ${centerX + ox + depth * scale / 3},${centerY - oy - height * scale / 4 + depth * scale / 6}
            ${centerX + ox + depth * scale / 3},${centerY - oy + depth * scale / 6}
            ${centerX + ox},${centerY - oy}
          `}
          fill={leftColor}
          stroke={showWireframe ? '#000' : 'none'}
          strokeWidth={showWireframe ? '1' : '0'}
          opacity={0.9}
        />
        {/* Right face */}
        <polygon
          points={`
            ${centerX + ox + depth * scale / 3},${centerY - oy - height * scale / 4 + depth * scale / 6}
            ${centerX + ox + width * scale / 3 + depth * scale / 3},${centerY - oy - height * scale / 4}
            ${centerX + ox + width * scale / 3 + depth * scale / 3},${centerY - oy}
            ${centerX + ox + depth * scale / 3},${centerY - oy + depth * scale / 6}
          `}
          fill={rightColor}
          stroke={showWireframe ? '#000' : 'none'}
          strokeWidth={showWireframe ? '1' : '0'}
          opacity={0.9}
        />
        {/* Selection indicator */}
        {isSelected && (
          <text
            x={centerX + ox + width * scale / 6}
            y={centerY - oy - height * scale / 4 - 10}
            fill="#3b82f6"
            fontSize="10"
            textAnchor="middle"
          >
            #{index + 1}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Model Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Box size={20} className="mr-2" />
          Model Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Model Name</label>
            <input
              type="text"
              value={model.name}
              onChange={(e) => setModel({ ...model, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="custom_block"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Parent Model</label>
            <select
              value={model.parent}
              onChange={(e) => setModel({ ...model, parent: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="minecraft:block/cube_all">block/cube_all</option>
              <option value="minecraft:block/cube">block/cube</option>
              <option value="minecraft:block/cube_column">block/cube_column</option>
              <option value="minecraft:block/cube_bottom_top">block/cube_bottom_top</option>
              <option value="minecraft:block/orientable">block/orientable</option>
              <option value="minecraft:block/cross">block/cross</option>
              <option value="minecraft:block/crop">block/crop</option>
              <option value="minecraft:item/generated">item/generated</option>
              <option value="minecraft:item/handheld">item/handheld</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={model.ambientOcclusion}
              onChange={(e) => setModel({ ...model, ambientOcclusion: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">Ambient Occlusion</span>
          </label>
        </div>
      </Card>

      {/* 3D Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">3D Preview</h3>
          <div className="flex gap-2">
            <Button onClick={() => setShowWireframe(!showWireframe)} size="sm" variant="outline">
              <Layers size={16} className="mr-1" />
              {showWireframe ? 'Solid' : 'Wire'}
            </Button>
            <Button onClick={handleZoomIn} size="sm" variant="outline">
              <ZoomIn size={16} />
            </Button>
            <Button onClick={handleZoomOut} size="sm" variant="outline">
              <ZoomOut size={16} />
            </Button>
            <Button onClick={handleResetView} size="sm" variant="outline">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>

        <div
          ref={canvasRef}
          className="bg-gray-900 rounded-lg border-2 border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ height: '300px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 300 240"
            style={{
              transform: `rotate(${rotation.x * 0.1}deg)`,
            }}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#333" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="300" height="240" fill="#1a1a2e" />
            <rect width="300" height="240" fill="url(#grid)" opacity="0.3" />

            {/* Axis indicators */}
            <line x1="20" y1="220" x2="50" y2="220" stroke="#ef4444" strokeWidth="2" />
            <text x="55" y="224" fill="#ef4444" fontSize="10">X</text>
            <line x1="20" y1="220" x2="20" y2="190" stroke="#22c55e" strokeWidth="2" />
            <text x="14" y="186" fill="#22c55e" fontSize="10">Y</text>
            <line x1="20" y1="220" x2="40" y2="230" stroke="#3b82f6" strokeWidth="2" />
            <text x="42" y="234" fill="#3b82f6" fontSize="10">Z</text>

            {/* Render elements */}
            {model.elements.map((element, idx) => renderIsometricCube(element, idx))}

            {/* Rotation indicator */}
            <text x="250" y="20" fill="#888" fontSize="9">
              <RotateCw size={10} />
              {rotation.y.toFixed(0)}° / {rotation.x.toFixed(0)}°
            </text>
            <text x="250" y="35" fill="#888" fontSize="9">
              Zoom: {zoom.toFixed(1)}x
            </text>
          </svg>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Drag to rotate • Scroll to zoom • Click element to select
        </p>
      </Card>

      {/* Elements List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Layers size={20} className="mr-2" />
            Elements ({model.elements.length})
          </h3>
          <Button onClick={handleAddElement} size="sm">
            + Add Element
          </Button>
        </div>
        <div className="space-y-2">
          {model.elements.map((element, idx) => (
            <div
              key={element.id}
              onClick={() => setSelectedElement(element.id)}
              className={`p-3 rounded-md border-2 cursor-pointer transition text-sm ${
                selectedElement === element.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Element #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    [{element.from.join(',')}] → [{element.to.join(',')}]
                  </span>
                  {model.elements.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveElement(element.id); }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Element Properties */}
      {selectedEl && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Element Properties</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From (X, Y, Z)</label>
              <div className="grid grid-cols-3 gap-2">
                {selectedEl.from.map((val, i) => (
                  <input
                    key={`from-${i}`}
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const newFrom = [...selectedEl.from] as [number, number, number];
                      newFrom[i] = parseFloat(e.target.value);
                      handleUpdateElement(selectedEl.id, 'from', newFrom);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="0"
                    max="16"
                    step="1"
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To (X, Y, Z)</label>
              <div className="grid grid-cols-3 gap-2">
                {selectedEl.to.map((val, i) => (
                  <input
                    key={`to-${i}`}
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const newTo = [...selectedEl.to] as [number, number, number];
                      newTo[i] = parseFloat(e.target.value);
                      handleUpdateElement(selectedEl.id, 'to', newTo);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm"
                    min="0"
                    max="16"
                    step="1"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Faces */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-3">Faces</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['north', 'south', 'east', 'west', 'up', 'down'] as const).map((face) => (
                <div
                  key={face}
                  className={`p-2 rounded text-center text-xs font-medium ${
                    selectedEl.faces[face]
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  {face.charAt(0).toUpperCase() + face.slice(1)}
                  {selectedEl.faces[face] && ' ✓'}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Textures */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Textures</h3>
          <Button onClick={handleAddTexture} size="sm" variant="outline">
            + Add Texture
          </Button>
        </div>
        <div className="space-y-3">
          {Object.entries(model.textures).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <input
                type="text"
                value={key}
                disabled
                className="w-32 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono bg-gray-50"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleUpdateTexture(key, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                placeholder="modid:block/texture_name"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* JSON Preview */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Model JSON Preview</h3>
          <Button onClick={handleExportJson} size="sm">
            <Download size={16} className="mr-2" />
            Export JSON
          </Button>
        </div>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
          <pre>{JSON.stringify({
            parent: model.parent,
            textures: model.textures,
            elements: model.elements.map(({ id, ...rest }) => rest),
            ambientocclusion: model.ambientOcclusion,
          }, null, 2)}</pre>
        </div>
      </Card>
    </div>
  );
};
