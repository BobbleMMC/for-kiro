/**
 * 2D Pixel Art Canvas Editor
 * Features: grid-based drawing, Bresenham's line algorithm, flood fill BFS,
 * color palette, brush sizes, undo/redo, zoom, export PNG
 */
import { useState, useRef, useCallback, useEffect, type FC } from 'react';
import {
  Paintbrush,
  Eraser,
  Pipette,
  PaintBucket,
  Minus,
  Square,
  Circle,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Trash2,
  Grid3x3,
  Save,
  } from 'lucide-react';

// ==================== Types ====================

type Tool = 'brush' | 'eraser' | 'eyedropper' | 'fill' | 'line' | 'rect' | 'circle';

interface PixelCanvasProps {
  width?: number;
  height?: number;
  initialPixelSize?: number;
}

// ==================== Algorithms ====================

/** Bresenham's Line Algorithm - draws precise pixel line between two points */
function bresenhamLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const points: [number, number][] = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

/** Flood Fill using BFS - fills connected area of same color */
function floodFillBFS(
  grid: string[][],
  startX: number,
  startY: number,
  fillColor: string,
  width: number,
  height: number
): string[][] {
  const targetColor = grid[startY]?.[startX];
  if (!targetColor || targetColor === fillColor) return grid;

  const newGrid = grid.map((row) => [...row]);
  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (newGrid[y][x] !== targetColor) continue;

    visited.add(key);
    newGrid[y][x] = fillColor;

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return newGrid;
}

/** Midpoint Circle Algorithm - draws circle outline */
function midpointCircle(cx: number, cy: number, radius: number): [number, number][] {
  const points: [number, number][] = [];
  let x = radius;
  let y = 0;
  let d = 1 - radius;

  const addSymmetricPoints = (px: number, py: number) => {
    points.push([cx + px, cy + py], [cx - px, cy + py]);
    points.push([cx + px, cy - py], [cx - px, cy - py]);
    points.push([cx + py, cy + px], [cx - py, cy + px]);
    points.push([cx + py, cy - px], [cx - py, cy - px]);
  };

  while (x >= y) {
    addSymmetricPoints(x, y);
    y++;
    if (d <= 0) {
      d += 2 * y + 1;
    } else {
      x--;
      d += 2 * (y - x) + 1;
    }
  }

  return points;
}

// ==================== Default Palette ====================

const defaultPalette = [
  '#000000', '#1d1d1d', '#4e4e4e', '#7c7c7c', '#a0a0a0', '#c8c8c8', '#ffffff',
  '#ff0000', '#ff6600', '#ffcc00', '#00ff00', '#00ccff', '#0066ff', '#9900ff',
  '#ff3366', '#ff9933', '#ffff00', '#33ff33', '#33cccc', '#3366ff', '#cc33ff',
  '#990000', '#994400', '#999900', '#009900', '#006699', '#000099', '#660099',
  '#663300', '#996633', '#cc9966', '#669966', '#336666', '#333399', '#663366',
];

// ==================== Main Component ====================

export const PixelCanvas: FC<PixelCanvasProps> = ({
  width = 16,
  height = 16,
  initialPixelSize = 24,
}) => {
  // Grid state
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: height }, () => Array(width).fill('transparent'))
  );

  // History for undo/redo
  const [history, setHistory] = useState<string[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pendingSnapshot, setPendingSnapshot] = useState(false);

  // Tool state
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<[number, number] | null>(null);
  const [shapeStart, setShapeStart] = useState<[number, number] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pixelSize = initialPixelSize * zoom;

  // ===== History Management =====

  const saveToHistory = useCallback(
    (newGrid: string[][]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newGrid.map((row) => [...row]));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setGrid(history[historyIndex - 1].map((row) => [...row]));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setGrid(history[historyIndex + 1].map((row) => [...row]));
    }
  }, [history, historyIndex]);

  // ===== Drawing Functions =====

  const getGridCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / pixelSize);
      const y = Math.floor((e.clientY - rect.top) / pixelSize);
      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      return [x, y];
    },
    [pixelSize, width, height]
  );

  const paintPixel = useCallback(
    (x: number, y: number, color: string, currentGrid: string[][]): string[][] => {
      const newGrid = currentGrid.map((row) => [...row]);
      const half = Math.floor(brushSize / 2);

      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            newGrid[py][px] = color;
          }
        }
      }
      return newGrid;
    },
    [brushSize, width, height]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getGridCoords(e);
      if (!coords) return;
      const [x, y] = coords;

      setIsDrawing(true);

      switch (currentTool) {
        case 'brush': {
          const newGrid = paintPixel(x, y, currentColor, grid);
          setGrid(newGrid);
          setPendingSnapshot(true);
          break;
        }
        case 'eraser': {
          const newGrid = paintPixel(x, y, 'transparent', grid);
          setGrid(newGrid);
          setPendingSnapshot(true);
          break;
        }
        case 'eyedropper': {
          const color = grid[y][x];
          if (color && color !== 'transparent') {
            setCurrentColor(color);
          }
          break;
        }
        case 'fill': {
          const newGrid = floodFillBFS(grid, x, y, currentColor, width, height);
          setGrid(newGrid);
          saveToHistory(newGrid);
          break;
        }
        case 'line': {
          setLineStart([x, y]);
          break;
        }
        case 'rect':
        case 'circle': {
          setShapeStart([x, y]);
          break;
        }
      }
    },
    [currentTool, currentColor, grid, getGridCoords, paintPixel, width, height, saveToHistory]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const coords = getGridCoords(e);
      if (!coords) return;
      const [x, y] = coords;

      if (currentTool === 'brush') {
        const newGrid = paintPixel(x, y, currentColor, grid);
        setGrid(newGrid);
      } else if (currentTool === 'eraser') {
        const newGrid = paintPixel(x, y, 'transparent', grid);
        setGrid(newGrid);
      }
    },
    [isDrawing, currentTool, currentColor, grid, getGridCoords, paintPixel]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      setIsDrawing(false);

      const coords = getGridCoords(e);

      if (currentTool === 'line' && lineStart && coords) {
        const points = bresenhamLine(lineStart[0], lineStart[1], coords[0], coords[1]);
        let newGrid = grid.map((row) => [...row]);
        for (const [px, py] of points) {
          if (px >= 0 && px < width && py >= 0 && py < height) {
            newGrid[py][px] = currentColor;
          }
        }
        setGrid(newGrid);
        saveToHistory(newGrid);
        setLineStart(null);
      } else if (currentTool === 'rect' && shapeStart && coords) {
        let newGrid = grid.map((row) => [...row]);
        const [x0, y0] = shapeStart;
        const [x1, y1] = coords;
        const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

        for (let x = minX; x <= maxX; x++) {
          if (x >= 0 && x < width) {
            if (minY >= 0 && minY < height) newGrid[minY][x] = currentColor;
            if (maxY >= 0 && maxY < height) newGrid[maxY][x] = currentColor;
          }
        }
        for (let y = minY; y <= maxY; y++) {
          if (y >= 0 && y < height) {
            if (minX >= 0 && minX < width) newGrid[y][minX] = currentColor;
            if (maxX >= 0 && maxX < width) newGrid[y][maxX] = currentColor;
          }
        }
        setGrid(newGrid);
        saveToHistory(newGrid);
        setShapeStart(null);
      } else if (currentTool === 'circle' && shapeStart && coords) {
        let newGrid = grid.map((row) => [...row]);
        const [x0, y0] = shapeStart;
        const [x1, y1] = coords;
        const radius = Math.round(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2));
        const points = midpointCircle(x0, y0, radius);

        for (const [px, py] of points) {
          if (px >= 0 && px < width && py >= 0 && py < height) {
            newGrid[py][px] = currentColor;
          }
        }
        setGrid(newGrid);
        saveToHistory(newGrid);
        setShapeStart(null);
      } else if (pendingSnapshot) {
        saveToHistory(grid);
        setPendingSnapshot(false);
      }
    },
    [isDrawing, currentTool, lineStart, shapeStart, grid, getGridCoords, currentColor, width, height, saveToHistory, pendingSnapshot]
  );

  // ===== Canvas Rendering =====

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard background for transparency
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#2a2a2a' : '#222222';
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = grid[y][x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    // Draw grid
    if (showGrid && pixelSize >= 8) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, height * pixelSize);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(width * pixelSize, y * pixelSize);
        ctx.stroke();
      }
    }
  }, [grid, pixelSize, width, height, showGrid]);

  // ===== Export =====

  const exportPNG = useCallback(() => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d')!;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = grid[y][x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    const link = document.createElement('a');
    link.download = 'texture.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [grid, width, height]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const newGrid = Array.from({ length: height }, () => Array(width).fill('transparent'));
    setGrid(newGrid);
    saveToHistory(newGrid);
  }, [width, height, saveToHistory]);

  // ===== Render =====

  const tools: { tool: Tool; icon: typeof Paintbrush; label: string }[] = [
    { tool: 'brush', icon: Paintbrush, label: 'Brush (B)' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser (E)' },
    { tool: 'eyedropper', icon: Pipette, label: 'Eyedropper (I)' },
    { tool: 'fill', icon: PaintBucket, label: 'Fill (G)' },
    { tool: 'line', icon: Minus, label: 'Line (L)' },
    { tool: 'rect', icon: Square, label: 'Rectangle (U)' },
    { tool: 'circle', icon: Circle, label: 'Circle (O)' },
  ];

  return (
    <div className="flex h-full w-full bg-slate-900">
      {/* Left Toolbar */}
      <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-1">
        {tools.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => setCurrentTool(tool)}
            className={`p-2 rounded-lg transition-colors ${
              currentTool === tool
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={label}
          >
            <Icon size={16} />
          </button>
        ))}

        <div className="h-px w-8 bg-slate-700 my-2" />

        {/* Brush Size */}
        <div className="flex flex-col items-center gap-1">
          {[1, 2, 3, 4].map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`w-7 h-7 flex items-center justify-center rounded ${
                brushSize === size
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-500 hover:text-white hover:bg-slate-700'
              }`}
              title={`Size ${size}`}
            >
              <div
                className="bg-current rounded-sm"
                style={{ width: 4 + size * 2, height: 4 + size * 2 }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Center - Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <button onClick={undo} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Redo (Ctrl+Y)">
            <Redo2 size={14} />
          </button>

          <div className="h-5 w-px bg-slate-600" />

          <button onClick={() => setZoom(Math.min(zoom + 0.25, 4))} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <span className="text-xs text-slate-400 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.max(zoom - 0.25, 0.5))} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Zoom Out">
            <ZoomOut size={14} />
          </button>

          <div className="h-5 w-px bg-slate-600" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded ${showGrid ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Toggle Grid"
          >
            <Grid3x3 size={14} />
          </button>

          <div className="flex-1" />

          <button onClick={clearCanvas} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400" title="Clear Canvas">
            <Trash2 size={14} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Save">
            <Save size={14} />
          </button>
          <button onClick={exportPNG} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400" title="Export PNG">
            <Download size={14} />
          </button>

          <div className="text-xs text-slate-500 ml-2">
            {width}×{height}px
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center bg-slate-950 p-8"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
            className="border border-slate-700 cursor-crosshair shadow-2xl"
            style={{
              imageRendering: 'pixelated',
            }}
          />
        </div>
      </div>

      {/* Right Panel - Color Palette */}
      <div className="w-52 bg-slate-800 border-l border-slate-700 flex flex-col">
        {/* Current Color */}
        <div className="p-3 border-b border-slate-700">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Active Color</label>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-10 h-10 rounded-lg border-2 border-slate-500 shadow-inner"
              style={{ backgroundColor: currentColor }}
            />
            <div className="flex-1">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-full h-6 rounded cursor-pointer"
              />
              <input
                type="text"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-full mt-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Palette */}
        <div className="p-3 border-b border-slate-700">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Palette</label>
          <div className="grid grid-cols-7 gap-1 mt-2">
            {defaultPalette.map((color, i) => (
              <button
                key={i}
                onClick={() => setCurrentColor(color)}
                className={`w-5 h-5 rounded-sm border transition-transform hover:scale-125 ${
                  currentColor === color ? 'border-white scale-110' : 'border-slate-600'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Canvas Dimensions */}
        <div className="p-3 border-b border-slate-700">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Canvas Info</label>
          <div className="mt-2 space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Dimensions:</span>
              <span className="text-slate-200">{width} × {height}</span>
            </div>
            <div className="flex justify-between">
              <span>Zoom:</span>
              <span className="text-slate-200">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Tool:</span>
              <span className="text-slate-200 capitalize">{currentTool}</span>
            </div>
            <div className="flex justify-between">
              <span>Brush Size:</span>
              <span className="text-slate-200">{brushSize}px</span>
            </div>
          </div>
        </div>

        {/* Preset Sizes */}
        <div className="p-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Quick Presets</label>
          <div className="mt-2 space-y-1">
            {[
              { label: 'Block (16×16)', w: 16, h: 16 },
              { label: 'Item (16×16)', w: 16, h: 16 },
              { label: 'Skin (64×64)', w: 64, h: 64 },
              { label: 'HD (32×32)', w: 32, h: 32 },
            ].map(({ label }) => (
              <button
                key={label}
                className="w-full px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 text-left transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
