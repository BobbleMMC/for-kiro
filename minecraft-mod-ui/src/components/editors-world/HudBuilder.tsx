/**
 * HUD Drag-and-Drop Builder
 * Visual editor for Minecraft in-game HUD overlays
 * Features: draggable elements, anchor positions, coordinate system, element library, preview
 */
import { useState, useCallback, useRef, type FC, type MouseEvent } from 'react';
import {
  Heart,
  Shield,
  Zap,
  Star,
  MessageSquare,
  Image,
  Type,
  Square,
  Circle,
  Plus,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
  Download,
        Layers,
  Move,
  Maximize2,
} from 'lucide-react';

// ==================== Types ====================

type AnchorX = 'left' | 'center' | 'right';
type AnchorY = 'top' | 'middle' | 'bottom';
type HudElementType = 'healthbar' | 'armorbar' | 'manabar' | 'xpbar' | 'text' | 'icon' | 'panel' | 'hotbar' | 'minimap' | 'custom';

interface HudElement {
  id: string;
  type: HudElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: AnchorX;
  anchorY: AnchorY;
  visible: boolean;
  locked: boolean;
  opacity: number;
  color: string;
  textContent?: string;
  fontSize?: number;
  iconPath?: string;
  zIndex: number;
}

interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

// ==================== Element Templates ====================

interface ElementTemplate {
  type: HudElementType;
  name: string;
  icon: typeof Heart;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultProps: Partial<HudElement>;
}

const elementTemplates: ElementTemplate[] = [
  {
    type: 'healthbar',
    name: 'Health Bar',
    icon: Heart,
    color: '#ef4444',
    defaultWidth: 160,
    defaultHeight: 20,
    defaultProps: { color: '#ef4444', anchorX: 'left', anchorY: 'bottom' },
  },
  {
    type: 'armorbar',
    name: 'Armor Bar',
    icon: Shield,
    color: '#64748b',
    defaultWidth: 160,
    defaultHeight: 16,
    defaultProps: { color: '#64748b', anchorX: 'left', anchorY: 'bottom' },
  },
  {
    type: 'manabar',
    name: 'Mana Bar',
    icon: Zap,
    color: '#3b82f6',
    defaultWidth: 140,
    defaultHeight: 16,
    defaultProps: { color: '#3b82f6', anchorX: 'right', anchorY: 'bottom' },
  },
  {
    type: 'xpbar',
    name: 'XP Bar',
    icon: Star,
    color: '#22c55e',
    defaultWidth: 200,
    defaultHeight: 8,
    defaultProps: { color: '#22c55e', anchorX: 'center', anchorY: 'bottom' },
  },
  {
    type: 'text',
    name: 'Text Label',
    icon: Type,
    color: '#ffffff',
    defaultWidth: 120,
    defaultHeight: 24,
    defaultProps: { color: '#ffffff', textContent: 'Label', fontSize: 14 },
  },
  {
    type: 'icon',
    name: 'Icon',
    icon: Image,
    color: '#f59e0b',
    defaultWidth: 32,
    defaultHeight: 32,
    defaultProps: { color: '#f59e0b' },
  },
  {
    type: 'panel',
    name: 'Panel BG',
    icon: Square,
    color: '#1e293b',
    defaultWidth: 200,
    defaultHeight: 100,
    defaultProps: { color: '#1e293bcc', opacity: 0.8 },
  },
  {
    type: 'hotbar',
    name: 'Hotbar',
    icon: Layers,
    color: '#334155',
    defaultWidth: 364,
    defaultHeight: 44,
    defaultProps: { color: '#334155', anchorX: 'center', anchorY: 'bottom' },
  },
  {
    type: 'minimap',
    name: 'Minimap',
    icon: Circle,
    color: '#065f46',
    defaultWidth: 120,
    defaultHeight: 120,
    defaultProps: { color: '#065f46', anchorX: 'right', anchorY: 'top' },
  },
  {
    type: 'custom',
    name: 'Custom Element',
    icon: MessageSquare,
    color: '#8b5cf6',
    defaultWidth: 80,
    defaultHeight: 40,
    defaultProps: { color: '#8b5cf6' },
  },
];

// ==================== Preview Resolution ====================

const PREVIEW_WIDTH = 854; // Minecraft default
const PREVIEW_HEIGHT = 480;

// ==================== Main Component ====================

export const HudBuilder: FC = () => {
  const idCounter = useRef(1);
  const generateId = () => `hud_${++idCounter.current}`;

  const [elements, setElements] = useState<HudElement[]>([
    {
      id: 'hud_hp',
      type: 'healthbar',
      name: 'Health',
      x: 20,
      y: PREVIEW_HEIGHT - 50,
      width: 160,
      height: 20,
      anchorX: 'left',
      anchorY: 'bottom',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#ef4444',
      zIndex: 10,
    },
    {
      id: 'hud_armor',
      type: 'armorbar',
      name: 'Armor',
      x: 20,
      y: PREVIEW_HEIGHT - 75,
      width: 160,
      height: 16,
      anchorX: 'left',
      anchorY: 'bottom',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#64748b',
      zIndex: 10,
    },
    {
      id: 'hud_hotbar',
      type: 'hotbar',
      name: 'Hotbar',
      x: (PREVIEW_WIDTH - 364) / 2,
      y: PREVIEW_HEIGHT - 48,
      width: 364,
      height: 44,
      anchorX: 'center',
      anchorY: 'bottom',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#1e293b',
      zIndex: 5,
    },
    {
      id: 'hud_xp',
      type: 'xpbar',
      name: 'XP Bar',
      x: (PREVIEW_WIDTH - 364) / 2,
      y: PREVIEW_HEIGHT - 52,
      width: 364,
      height: 6,
      anchorX: 'center',
      anchorY: 'bottom',
      visible: true,
      locked: false,
      opacity: 1,
      color: '#22c55e',
      zIndex: 6,
    },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>('hud_hp');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // ===== Element Operations =====

  const addElement = useCallback((template: ElementTemplate) => {
    const id = generateId();
    const newElement: HudElement = {
      id,
      type: template.type,
      name: template.name,
      x: PREVIEW_WIDTH / 2 - template.defaultWidth / 2,
      y: PREVIEW_HEIGHT / 2 - template.defaultHeight / 2,
      width: template.defaultWidth,
      height: template.defaultHeight,
      anchorX: (template.defaultProps.anchorX as AnchorX) || 'center',
      anchorY: (template.defaultProps.anchorY as AnchorY) || 'middle',
      visible: true,
      locked: false,
      opacity: template.defaultProps.opacity || 1,
      color: template.color,
      textContent: template.defaultProps.textContent,
      fontSize: template.defaultProps.fontSize,
      zIndex: elements.length + 1,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(id);
  }, [elements.length]);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const duplicateElement = useCallback((id: string) => {
    const source = elements.find((e) => e.id === id);
    if (!source) return;
    const newId = generateId();
    const clone: HudElement = { ...source, id: newId, name: `${source.name} (copy)`, x: source.x + 20, y: source.y + 20 };
    setElements((prev) => [...prev, clone]);
    setSelectedId(newId);
  }, [elements]);

  const updateElement = useCallback((id: string, updates: Partial<HudElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  // ===== Drag & Drop =====

  const handleMouseDown = useCallback((e: MouseEvent, elementId: string) => {
    const el = elements.find((el) => el.id === elementId);
    if (!el || el.locked) return;
    e.stopPropagation();
    e.preventDefault();

    const preview = previewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();

    setDragState({
      elementId,
      startX: el.x,
      startY: el.y,
      offsetX: e.clientX - rect.left - el.x,
      offsetY: e.clientY - rect.top - el.y,
    });
    setSelectedId(elementId);
  }, [elements]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const preview = previewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();

    let newX = e.clientX - rect.left - dragState.offsetX;
    let newY = e.clientY - rect.top - dragState.offsetY;

    // Snap to grid (8px)
    if (showGrid) {
      newX = Math.round(newX / 8) * 8;
      newY = Math.round(newY / 8) * 8;
    }

    // Clamp to bounds
    const el = elements.find((el) => el.id === dragState.elementId);
    if (el) {
      newX = Math.max(0, Math.min(PREVIEW_WIDTH - el.width, newX));
      newY = Math.max(0, Math.min(PREVIEW_HEIGHT - el.height, newY));
    }

    updateElement(dragState.elementId, { x: newX, y: newY });
  }, [dragState, elements, showGrid, updateElement]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const selectedElement = elements.find((e) => e.id === selectedId);

  // ===== Render =====

  return (
    <div className="flex w-full h-full bg-slate-900">
      {/* Left - Element Library */}
      <div className="w-52 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-bold text-slate-200">HUD Elements</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {elementTemplates.map((tmpl, i) => (
            <button
              key={i}
              onClick={() => addElement(tmpl)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded border border-slate-700 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left"
            >
              <tmpl.icon size={14} style={{ color: tmpl.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-slate-300">{tmpl.name}</div>
                <div className="text-[9px] text-slate-500">{tmpl.defaultWidth}×{tmpl.defaultHeight}</div>
              </div>
              <Plus size={10} className="text-slate-500" />
            </button>
          ))}
        </div>

        {/* Layer List */}
        <div className="border-t border-slate-700">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Layers</span>
            <span className="text-[9px] text-slate-500">{elements.length}</span>
          </div>
          <div className="max-h-40 overflow-y-auto px-2 pb-2 space-y-0.5">
            {[...elements].sort((a, b) => b.zIndex - a.zIndex).map((el) => (
              <div
                key={el.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer ${
                  el.id === selectedId
                    ? 'bg-blue-600/20 border border-blue-500/50 text-blue-200'
                    : 'hover:bg-slate-700 text-slate-400'
                }`}
                onClick={() => setSelectedId(el.id)}
              >
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: el.color }} />
                <span className="flex-1 truncate">{el.name}</span>
                {el.locked && <Lock size={8} className="text-slate-500" />}
                {!el.visible && <EyeOff size={8} className="text-slate-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center - HUD Preview */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded text-xs ${showGrid ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Snap to Grid"
          >
            <Maximize2 size={14} />
          </button>

          <div className="h-5 w-px bg-slate-600" />

          <button
            onClick={() => selectedId && deleteElement(selectedId)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => selectedId && duplicateElement(selectedId)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>

          <div className="flex-1" />

          <span className="text-[10px] text-slate-500">{PREVIEW_WIDTH}×{PREVIEW_HEIGHT}</span>

          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Save">
            <Save size={14} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400" title="Export">
            <Download size={14} />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-slate-950 overflow-auto p-4">
          <div
            ref={previewRef}
            className="relative border border-slate-700 shadow-2xl overflow-hidden cursor-default"
            style={{
              width: PREVIEW_WIDTH,
              height: PREVIEW_HEIGHT,
              backgroundImage: 'linear-gradient(180deg, #0c4a6e 0%, #075985 40%, #0369a1 100%)',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedId(null)}
          >
            {/* Grid overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '8px 8px',
                }}
              />
            )}

            {/* Center crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-6 h-6 border border-white/20 rounded-full" />
              <div className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* HUD Elements */}
            {elements
              .filter((el) => el.visible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <div
                  key={el.id}
                  className={`absolute cursor-move select-none ${
                    el.id === selectedId ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent' : ''
                  } ${el.locked ? 'cursor-not-allowed' : ''}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    opacity: el.opacity,
                    zIndex: el.zIndex,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                >
                  {/* Element visual based on type */}
                  {el.type === 'healthbar' && (
                    <div className="w-full h-full rounded-sm overflow-hidden border border-red-900/50">
                      <div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: '75%' }} />
                    </div>
                  )}
                  {el.type === 'armorbar' && (
                    <div className="w-full h-full rounded-sm overflow-hidden border border-slate-600/50">
                      <div className="h-full bg-gradient-to-r from-slate-600 to-slate-400" style={{ width: '60%' }} />
                    </div>
                  )}
                  {el.type === 'manabar' && (
                    <div className="w-full h-full rounded-sm overflow-hidden border border-blue-900/50">
                      <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400" style={{ width: '85%' }} />
                    </div>
                  )}
                  {el.type === 'xpbar' && (
                    <div className="w-full h-full rounded-full overflow-hidden border border-green-900/50">
                      <div className="h-full bg-gradient-to-r from-green-600 to-green-400" style={{ width: '45%' }} />
                    </div>
                  )}
                  {el.type === 'text' && (
                    <div className="w-full h-full flex items-center" style={{ color: el.color, fontSize: el.fontSize || 14 }}>
                      {el.textContent || 'Text'}
                    </div>
                  )}
                  {el.type === 'icon' && (
                    <div className="w-full h-full flex items-center justify-center rounded" style={{ backgroundColor: el.color + '33' }}>
                      <Image size={16} style={{ color: el.color }} />
                    </div>
                  )}
                  {el.type === 'panel' && (
                    <div className="w-full h-full rounded-lg border border-slate-600/50" style={{ backgroundColor: el.color }} />
                  )}
                  {el.type === 'hotbar' && (
                    <div className="w-full h-full rounded bg-black/60 border border-slate-500/30 flex items-center justify-center gap-1 px-1">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="w-9 h-9 border border-slate-500/50 rounded-sm bg-slate-800/50" />
                      ))}
                    </div>
                  )}
                  {el.type === 'minimap' && (
                    <div className="w-full h-full rounded-full border-2 border-slate-400/50 overflow-hidden" style={{ backgroundColor: el.color }}>
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-white/50">MAP</div>
                    </div>
                  )}
                  {el.type === 'custom' && (
                    <div className="w-full h-full rounded border border-dashed border-purple-500/50 flex items-center justify-center" style={{ backgroundColor: el.color + '22' }}>
                      <span className="text-[8px] text-purple-300">Custom</span>
                    </div>
                  )}

                  {/* Selection indicator */}
                  {el.id === selectedId && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full" />
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Bottom coordinates */}
        <div className="px-4 py-1.5 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
          {selectedElement && (
            <span>
              X: {selectedElement.x} Y: {selectedElement.y} | {selectedElement.width}×{selectedElement.height} | Anchor: {selectedElement.anchorX}-{selectedElement.anchorY}
            </span>
          )}
          {!selectedElement && <span>Click an element to select</span>}
          <span>HUD Builder · {PREVIEW_WIDTH}×{PREVIEW_HEIGHT}</span>
        </div>
      </div>

      {/* Right - Inspector */}
      <div className="w-60 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-bold text-slate-200">Inspector</span>
        </div>

        {selectedElement ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
              <input
                type="text"
                value={selectedElement.name}
                onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Position</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">X</span>
                  <input
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">Y</span>
                  <input
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Size</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">W</span>
                  <input
                    type="number"
                    min={8}
                    value={selectedElement.width}
                    onChange={(e) => updateElement(selectedElement.id, { width: Math.max(8, parseInt(e.target.value) || 8) })}
                    className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">H</span>
                  <input
                    type="number"
                    min={4}
                    value={selectedElement.height}
                    onChange={(e) => updateElement(selectedElement.id, { height: Math.max(4, parseInt(e.target.value) || 4) })}
                    className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                  />
                </div>
              </div>
            </div>

            {/* Anchor */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Anchor</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <select
                  value={selectedElement.anchorX}
                  onChange={(e) => updateElement(selectedElement.id, { anchorX: e.target.value as AnchorX })}
                  className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <select
                  value={selectedElement.anchorY}
                  onChange={(e) => updateElement(selectedElement.id, { anchorY: e.target.value as AnchorY })}
                  className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Color</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={selectedElement.color.substring(0, 7)}
                  onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                  className="w-8 h-7 rounded border border-slate-600"
                />
                <input
                  type="text"
                  value={selectedElement.color}
                  onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white font-mono"
                />
              </div>
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Opacity</label>
                <span className="text-[9px] text-slate-400">{Math.round(selectedElement.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selectedElement.opacity}
                onChange={(e) => updateElement(selectedElement.id, { opacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 mt-1 accent-blue-500"
              />
            </div>

            {/* Z-Index */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Z-Index (Layer Order)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={selectedElement.zIndex}
                onChange={(e) => updateElement(selectedElement.id, { zIndex: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
              />
            </div>

            {/* Text content (for text elements) */}
            {selectedElement.type === 'text' && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Text Content</label>
                <input
                  type="text"
                  value={selectedElement.textContent || ''}
                  onChange={(e) => updateElement(selectedElement.id, { textContent: e.target.value })}
                  className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                />
                <label className="text-[10px] font-bold text-slate-400 uppercase mt-2 block">Font Size</label>
                <input
                  type="number"
                  min={8}
                  max={48}
                  value={selectedElement.fontSize || 14}
                  onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 14 })}
                  className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                />
              </div>
            )}

            {/* Toggles */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-700">
              <button
                onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                  selectedElement.locked ? 'bg-red-900/50 text-red-300' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {selectedElement.locked ? <Lock size={10} /> : <Unlock size={10} />}
                {selectedElement.locked ? 'Locked' : 'Unlocked'}
              </button>
              <button
                onClick={() => updateElement(selectedElement.id, { visible: !selectedElement.visible })}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                  !selectedElement.visible ? 'bg-yellow-900/50 text-yellow-300' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {selectedElement.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                {selectedElement.visible ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-xs text-slate-500">
              <Move size={32} className="mx-auto mb-2 text-slate-600" />
              <p>Select an element to edit</p>
              <p className="mt-1 text-[9px]">Drag to reposition</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
