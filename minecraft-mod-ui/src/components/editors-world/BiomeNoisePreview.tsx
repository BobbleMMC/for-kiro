/**
 * Biome Noise Generator Preview
 * Interactive 2D Perlin noise visualization for biome terrain generation
 * Features: configurable octaves, frequency, amplitude, seed, real-time canvas preview
 */
import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import {
  RefreshCw,
  Download,
      Mountain,
  Waves,
  TreePine,
  Snowflake,
  Sun,
  } from 'lucide-react';

// ==================== Perlin Noise Implementation ====================

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = 0) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const perm = Array.from({ length: 256 }, (_, i) => i);
    // Seeded Fisher-Yates shuffle
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 1) % 2147483647;
      const j = s % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return [...perm, ...perm]; // Double for overflow
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const p = this.permutation;
    const A = p[X] + Y;
    const B = p[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(u, this.grad(p[A], xf, yf), this.grad(p[B], xf - 1, yf)),
      this.lerp(u, this.grad(p[A + 1], xf, yf - 1), this.grad(p[B + 1], xf - 1, yf - 1))
    );
  }

  /** Multi-octave fractal noise (fBm) */
  fbm(x: number, y: number, octaves: number, frequency: number, amplitude: number, lacunarity: number, persistence: number): number {
    let value = 0;
    let freq = frequency;
    let amp = amplitude;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * freq, y * freq) * amp;
      maxAmp += amp;
      freq *= lacunarity;
      amp *= persistence;
    }

    return value / maxAmp; // Normalize to [-1, 1]
  }
}

// ==================== Biome Color Mapping ====================

interface BiomeLayer {
  name: string;
  minHeight: number;
  maxHeight: number;
  color: string;
  icon: typeof Mountain;
}

const defaultBiomeLayers: BiomeLayer[] = [
  { name: 'Deep Ocean', minHeight: -1.0, maxHeight: -0.5, color: '#1a237e', icon: Waves },
  { name: 'Ocean', minHeight: -0.5, maxHeight: -0.2, color: '#1565c0', icon: Waves },
  { name: 'Beach', minHeight: -0.2, maxHeight: -0.05, color: '#f9a825', icon: Sun },
  { name: 'Plains', minHeight: -0.05, maxHeight: 0.2, color: '#4caf50', icon: TreePine },
  { name: 'Forest', minHeight: 0.2, maxHeight: 0.4, color: '#2e7d32', icon: TreePine },
  { name: 'Hills', minHeight: 0.4, maxHeight: 0.6, color: '#6d4c41', icon: Mountain },
  { name: 'Mountains', minHeight: 0.6, maxHeight: 0.8, color: '#78909c', icon: Mountain },
  { name: 'Snow Peaks', minHeight: 0.8, maxHeight: 1.0, color: '#eceff1', icon: Snowflake },
];

function getColorForHeight(height: number, layers: BiomeLayer[]): string {
  for (const layer of layers) {
    if (height >= layer.minHeight && height < layer.maxHeight) {
      return layer.color;
    }
  }
  return layers[layers.length - 1].color;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// ==================== Main Component ====================

interface NoiseParams {
  seed: number;
  octaves: number;
  frequency: number;
  amplitude: number;
  lacunarity: number;
  persistence: number;
  offsetX: number;
  offsetY: number;
}

export const BiomeNoisePreview: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState(512);

  const [params, setParams] = useState<NoiseParams>({
    seed: 42,
    octaves: 6,
    frequency: 0.02,
    amplitude: 1.0,
    lacunarity: 2.0,
    persistence: 0.5,
    offsetX: 0,
    offsetY: 0,
  });

  const [biomeLayers] = useState<BiomeLayer[]>(defaultBiomeLayers);
  const [viewMode, setViewMode] = useState<'biome' | 'heightmap' | 'moisture'>('biome');
  const [isRendering, setIsRendering] = useState(false);

  // ===== Generate Noise Map =====

  const renderNoise = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const imageData = ctx.createImageData(canvasSize, canvasSize);
    const perlin = new PerlinNoise(params.seed);
    const moisturePerlin = new PerlinNoise(params.seed + 1000);

    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const nx = (x + params.offsetX) / canvasSize;
        const ny = (y + params.offsetY) / canvasSize;

        const height = perlin.fbm(
          nx,
          ny,
          params.octaves,
          params.frequency * canvasSize,
          params.amplitude,
          params.lacunarity,
          params.persistence
        );

        const idx = (y * canvasSize + x) * 4;

        if (viewMode === 'heightmap') {
          // Grayscale heightmap
          const val = Math.floor(((height + 1) / 2) * 255);
          imageData.data[idx] = val;
          imageData.data[idx + 1] = val;
          imageData.data[idx + 2] = val;
        } else if (viewMode === 'moisture') {
          // Moisture map (separate noise layer)
          const moisture = moisturePerlin.fbm(nx, ny, 4, params.frequency * canvasSize * 0.7, 1, 2, 0.5);
          const val = Math.floor(((moisture + 1) / 2) * 255);
          imageData.data[idx] = 0;
          imageData.data[idx + 1] = Math.floor(val * 0.5);
          imageData.data[idx + 2] = val;
        } else {
          // Biome colored view
          const color = getColorForHeight(height, biomeLayers);
          const [r, g, b] = hexToRgb(color);
          imageData.data[idx] = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
        }

        imageData.data[idx + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setIsRendering(false);
  }, [canvasSize, params, viewMode, biomeLayers]);

  // Auto-render on param change
  useEffect(() => {
    renderNoise();
  }, [renderNoise]);

  // Randomize seed
  const randomizeSeed = useCallback(() => {
    setParams((prev) => ({ ...prev, seed: Math.floor(Math.random() * 999999) }));
  }, []);

  // Export as PNG
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `biome_noise_${params.seed}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [params.seed]);

  // ===== Render =====

  return (
    <div className="flex w-full h-full bg-slate-900">
      {/* Left - Controls */}
      <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Mountain size={16} className="text-emerald-400" />
            Biome Noise Generator
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">2D Perlin fBm terrain preview</p>
        </div>

        {/* View Mode */}
        <div className="px-4 py-3 border-b border-slate-700">
          <label className="text-[10px] font-bold text-slate-400 uppercase">View Mode</label>
          <div className="flex gap-1 mt-2">
            {(['biome', 'heightmap', 'moisture'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold capitalize ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Noise Parameters */}
        <div className="px-4 py-3 space-y-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Noise Parameters</label>
            <button
              onClick={randomizeSeed}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
              title="Random Seed"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Seed */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-slate-500">Seed</label>
              <span className="text-[9px] text-slate-400 font-mono">{params.seed}</span>
            </div>
            <input
              type="number"
              value={params.seed}
              onChange={(e) => setParams((p) => ({ ...p, seed: parseInt(e.target.value) || 0 }))}
              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white mt-1"
            />
          </div>

          {/* Octaves */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-slate-500">Octaves</label>
              <span className="text-[9px] text-slate-400">{params.octaves}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={params.octaves}
              onChange={(e) => setParams((p) => ({ ...p, octaves: parseInt(e.target.value) }))}
              className="w-full h-1.5 mt-1 accent-blue-500"
            />
          </div>

          {/* Frequency */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-slate-500">Frequency</label>
              <span className="text-[9px] text-slate-400">{params.frequency.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0.001}
              max={0.1}
              step={0.001}
              value={params.frequency}
              onChange={(e) => setParams((p) => ({ ...p, frequency: parseFloat(e.target.value) }))}
              className="w-full h-1.5 mt-1 accent-blue-500"
            />
          </div>

          {/* Lacunarity */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-slate-500">Lacunarity</label>
              <span className="text-[9px] text-slate-400">{params.lacunarity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={4.0}
              step={0.1}
              value={params.lacunarity}
              onChange={(e) => setParams((p) => ({ ...p, lacunarity: parseFloat(e.target.value) }))}
              className="w-full h-1.5 mt-1 accent-blue-500"
            />
          </div>

          {/* Persistence */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-slate-500">Persistence</label>
              <span className="text-[9px] text-slate-400">{params.persistence.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={params.persistence}
              onChange={(e) => setParams((p) => ({ ...p, persistence: parseFloat(e.target.value) }))}
              className="w-full h-1.5 mt-1 accent-blue-500"
            />
          </div>

          {/* Offset */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-slate-500">Offset X</label>
              <input
                type="number"
                value={params.offsetX}
                onChange={(e) => setParams((p) => ({ ...p, offsetX: parseInt(e.target.value) || 0 }))}
                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500">Offset Y</label>
              <input
                type="number"
                value={params.offsetY}
                onChange={(e) => setParams((p) => ({ ...p, offsetY: parseInt(e.target.value) || 0 }))}
                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* Biome Legend */}
        <div className="px-4 py-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Biome Layers</label>
          <div className="mt-2 space-y-1">
            {biomeLayers.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div
                    className="w-4 h-4 rounded-sm border border-slate-600"
                    style={{ backgroundColor: layer.color }}
                  />
                  <Icon size={10} className="text-slate-400" />
                  <span className="text-slate-300 flex-1">{layer.name}</span>
                  <span className="text-slate-500 font-mono text-[8px]">
                    {layer.minHeight.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center - Canvas Preview */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {canvasSize}×{canvasSize}px
          </span>

          <div className="flex-1" />

          {isRendering && (
            <span className="text-[10px] text-blue-400 animate-pulse">Rendering...</span>
          )}

          <button
            onClick={renderNoise}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
            title="Regenerate"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={exportPNG}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400"
            title="Export PNG"
          >
            <Download size={14} />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-slate-950 overflow-auto p-4">
          <canvas
            ref={canvasRef}
            className="border border-slate-700 shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Bottom status */}
        <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
          <span>Seed: {params.seed} | Octaves: {params.octaves} | Freq: {params.frequency.toFixed(3)}</span>
          <span>Perlin fBm · {viewMode} view</span>
        </div>
      </div>
    </div>
  );
};
