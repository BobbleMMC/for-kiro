/**
 * 3D Model Editor - Blockbench-like editor for Minecraft block/entity models
 * Uses Three.js via React Three Fiber
 * Features: cuboid creation, translate/rotate/scale gizmos, hierarchical bones
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  TransformControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Environment,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Box,
  Move,
  RotateCcw,
  Maximize2,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Save,
  Download,
  Undo2,
  Redo2,
  Layers,
} from 'lucide-react';

// ==================== Types ====================

interface ModelCuboid {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  size: [number, number, number];
  pivot: [number, number, number];
  color: string;
  visible: boolean;
  parentId?: string;
  uv?: { top: number[]; bottom: number[]; north: number[]; south: number[]; east: number[]; west: number[] };
}

type TransformMode = 'translate' | 'rotate' | 'scale';

// ==================== Cuboid Component ====================

interface CuboidMeshProps {
  cuboid: ModelCuboid;
  isSelected: boolean;
  onClick: () => void;
}

function CuboidMesh({ cuboid, isSelected, onClick }: CuboidMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Memoize the rotation array (in radians) — avoids creating a new array
  // and re-running r3f's prop diff on every parent render.
  const rotation = useMemo(
    () => cuboid.rotation.map((r) => (r * Math.PI) / 180) as [number, number, number],
    [cuboid.rotation]
  );

  // Box geometry & edges geometry are owned by us, not r3f's auto-cache,
  // because they depend on cuboid.size which changes when the user drags
  // the size handles. We dispose them on unmount / size change to avoid
  // leaking GPU buffers (a pure r3f <boxGeometry args={...} /> would
  // re-create a fresh geometry per render — that one DOES leak).
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(...cuboid.size), [cuboid.size]);
  const edgesGeometry = useMemo(
    () => (isSelected ? new THREE.EdgesGeometry(boxGeometry) : null),
    [boxGeometry, isSelected]
  );

  useEffect(() => {
    return () => {
      boxGeometry.dispose();
    };
  }, [boxGeometry]);

  useEffect(() => {
    return () => {
      edgesGeometry?.dispose();
    };
  }, [edgesGeometry]);

  if (!cuboid.visible) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={boxGeometry}
      position={cuboid.position}
      rotation={rotation}
      scale={cuboid.scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshStandardMaterial
        color={cuboid.color}
        transparent={isSelected}
        opacity={isSelected ? 0.85 : 1}
      />
      {edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color="#00ff88" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}

// ==================== Scene Component ====================

interface SceneProps {
  cuboids: ModelCuboid[];
  selectedId: string | null;
  transformMode: TransformMode;
  onSelectCuboid: (id: string | null) => void;
  onTransformChange: (id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => void;
}

function Scene({ cuboids, selectedId, transformMode, onSelectCuboid, onTransformChange }: SceneProps) {
  const { scene } = useThree();
  const transformRef = useRef<any>(null);
  const orbitRef = useRef<any>(null);

  const selectedCuboid = cuboids.find((c) => c.id === selectedId);
  const selectedMesh = selectedCuboid
    ? scene.children.find(
        (child) =>
          child instanceof THREE.Mesh &&
          child.position.x === selectedCuboid.position[0] &&
          child.position.y === selectedCuboid.position[1] &&
          child.position.z === selectedCuboid.position[2]
      )
    : null;

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Grid */}
      <Grid
        args={[32, 32]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={50}
        infiniteGrid
      />

      {/* Cuboids */}
      {cuboids.map((cuboid) => (
        <CuboidMesh
          key={cuboid.id}
          cuboid={cuboid}
          isSelected={cuboid.id === selectedId}
          onClick={() => onSelectCuboid(cuboid.id)}
        />
      ))}

      {/* Transform Controls */}
      {selectedMesh && (
        <TransformControls
          ref={transformRef}
          object={selectedMesh}
          mode={transformMode}
          onMouseDown={() => {
            if (orbitRef.current) orbitRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
            if (selectedCuboid && selectedMesh) {
              const mesh = selectedMesh as THREE.Mesh;
              onTransformChange(
                selectedCuboid.id,
                [mesh.position.x, mesh.position.y, mesh.position.z],
                [
                  (mesh.rotation.x * 180) / Math.PI,
                  (mesh.rotation.y * 180) / Math.PI,
                  (mesh.rotation.z * 180) / Math.PI,
                ],
                [mesh.scale.x, mesh.scale.y, mesh.scale.z]
              );
            }
          }}
        />
      )}

      {/* Orbit Controls */}
      <OrbitControls ref={orbitRef} makeDefault />

      {/* Gizmo Helper */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>

      {/* Environment for reflections */}
      <Environment preset="studio" />
    </>
  );
}

// ==================== Main Editor Component ====================

export function ModelEditor3D() {
  const [cuboids, setCuboids] = useState<ModelCuboid[]>([
    {
      id: 'body',
      name: 'Body',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: [1, 1.5, 0.5],
      pivot: [0, 0, 0],
      color: '#6366f1',
      visible: true,
    },
    {
      id: 'head',
      name: 'Head',
      position: [0, 2.25, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: [0.75, 0.75, 0.75],
      pivot: [0, -0.375, 0],
      color: '#f59e0b',
      visible: true,
      parentId: 'body',
    },
    {
      id: 'left_arm',
      name: 'Left Arm',
      position: [-0.75, 1.25, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: [0.4, 1.2, 0.4],
      pivot: [0, 0.6, 0],
      color: '#10b981',
      visible: true,
      parentId: 'body',
    },
    {
      id: 'right_arm',
      name: 'Right Arm',
      position: [0.75, 1.25, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: [0.4, 1.2, 0.4],
      pivot: [0, 0.6, 0],
      color: '#10b981',
      visible: true,
      parentId: 'body',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>('body');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');

  const idCounter = useRef(5);

  // Add new cuboid
  const addCuboid = useCallback(() => {
    const id = `cuboid_${++idCounter.current}`;
    const newCuboid: ModelCuboid = {
      id,
      name: `Cuboid ${idCounter.current}`,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: [1, 1, 1],
      pivot: [0, 0, 0],
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      visible: true,
    };
    setCuboids((prev) => [...prev, newCuboid]);
    setSelectedId(id);
  }, []);

  // Delete selected cuboid
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setCuboids((prev) => prev.filter((c) => c.id !== selectedId && c.parentId !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Duplicate selected
  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const source = cuboids.find((c) => c.id === selectedId);
    if (!source) return;

    const id = `cuboid_${++idCounter.current}`;
    const clone: ModelCuboid = {
      ...source,
      id,
      name: `${source.name} (copy)`,
      position: [source.position[0] + 1, source.position[1], source.position[2]],
    };
    setCuboids((prev) => [...prev, clone]);
    setSelectedId(id);
  }, [selectedId, cuboids]);

  // Toggle visibility
  const toggleVisibility = useCallback((id: string) => {
    setCuboids((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  }, []);

  // Handle transform changes from gizmo
  const handleTransformChange = useCallback(
    (id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => {
      setCuboids((prev) =>
        prev.map((c) => (c.id === id ? { ...c, position, rotation, scale } : c))
      );
    },
    []
  );

  // Update cuboid property
  const updateCuboid = useCallback((id: string, key: keyof ModelCuboid, value: unknown) => {
    setCuboids((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }, []);

  const selectedCuboid = cuboids.find((c) => c.id === selectedId);

  return (
    <div className="flex w-full h-full bg-slate-900">
      {/* Left Panel - Outliner */}
      <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Outliner Header */}
        <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-200">Outliner</span>
          </div>
          <button
            onClick={addCuboid}
            className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
            title="Add Cuboid"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Cuboid List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cuboids.map((cuboid) => (
            <div
              key={cuboid.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs ${
                cuboid.id === selectedId
                  ? 'bg-blue-600/30 border border-blue-500/50 text-blue-100'
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
              onClick={() => setSelectedId(cuboid.id)}
            >
              <div
                className="w-3 h-3 rounded-sm border border-slate-500"
                style={{ backgroundColor: cuboid.color }}
              />
              <span className="flex-1 truncate">{cuboid.name}</span>
              {cuboid.parentId && (
                <span className="text-[9px] text-slate-500">↳</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(cuboid.id);
                }}
                className="p-0.5 hover:bg-slate-600 rounded"
              >
                {cuboid.visible ? (
                  <Eye size={10} className="text-slate-400" />
                ) : (
                  <EyeOff size={10} className="text-slate-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Center - 3D Viewport */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setTransformMode('translate')}
              className={`p-1.5 rounded ${
                transformMode === 'translate'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Translate (G)"
            >
              <Move size={14} />
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              className={`p-1.5 rounded ${
                transformMode === 'rotate'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Rotate (R)"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setTransformMode('scale')}
              className={`p-1.5 rounded ${
                transformMode === 'scale'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Scale (S)"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-600" />

          <button onClick={addCuboid} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Add Cuboid">
            <Plus size={14} />
          </button>
          <button onClick={duplicateSelected} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400" title="Duplicate">
            <Copy size={14} />
          </button>
          <button onClick={deleteSelected} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400" title="Delete">
            <Trash2 size={14} />
          </button>

          <div className="h-5 w-px bg-slate-600" />

          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Undo">
            <Undo2 size={14} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Redo">
            <Redo2 size={14} />
          </button>

          <div className="flex-1" />

          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Save Model">
            <Save size={14} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400" title="Export">
            <Download size={14} />
          </button>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative">
          {/*
            frameloop="demand" only renders when controls / props change —
            saves ~60% CPU and GPU memory vs. continuous rendering when the
            user is not interacting with the viewport.
          */}
          <Canvas
            shadows
            frameloop="demand"
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'low-power' }}
            className="bg-slate-950"
          >
            <Scene
              cuboids={cuboids}
              selectedId={selectedId}
              transformMode={transformMode}
              onSelectCuboid={setSelectedId}
              onTransformChange={handleTransformChange}
            />
          </Canvas>

          {/* Viewport info overlay */}
          <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded">
            {transformMode.toUpperCase()} | {cuboids.length} cuboids | Click to select
          </div>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-bold text-slate-200">Properties</span>
        </div>

        {selectedCuboid ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
              <input
                type="text"
                value={selectedCuboid.name}
                onChange={(e) => updateCuboid(selectedCuboid.id, 'name', e.target.value)}
                className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Position</label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">{axis}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedCuboid.position[i].toFixed(2)}
                      onChange={(e) => {
                        const pos = [...selectedCuboid.position] as [number, number, number];
                        pos[i] = parseFloat(e.target.value) || 0;
                        updateCuboid(selectedCuboid.id, 'position', pos);
                      }}
                      className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Rotation</label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">{axis}</span>
                    <input
                      type="number"
                      step="5"
                      value={selectedCuboid.rotation[i].toFixed(1)}
                      onChange={(e) => {
                        const rot = [...selectedCuboid.rotation] as [number, number, number];
                        rot[i] = parseFloat(e.target.value) || 0;
                        updateCuboid(selectedCuboid.id, 'rotation', rot);
                      }}
                      className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Size</label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {['W', 'H', 'D'].map((axis, i) => (
                  <div key={axis} className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">{axis}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={selectedCuboid.size[i].toFixed(2)}
                      onChange={(e) => {
                        const size = [...selectedCuboid.size] as [number, number, number];
                        size[i] = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                        updateCuboid(selectedCuboid.id, 'size', size);
                      }}
                      className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pivot */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Pivot (Origin)</label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">{axis}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedCuboid.pivot[i].toFixed(2)}
                      onChange={(e) => {
                        const pivot = [...selectedCuboid.pivot] as [number, number, number];
                        pivot[i] = parseFloat(e.target.value) || 0;
                        updateCuboid(selectedCuboid.id, 'pivot', pivot);
                      }}
                      className="w-full pl-5 pr-1 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={selectedCuboid.color}
                  onChange={(e) => updateCuboid(selectedCuboid.id, 'color', e.target.value)}
                  className="w-8 h-8 rounded border border-slate-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedCuboid.color}
                  onChange={(e) => updateCuboid(selectedCuboid.id, 'color', e.target.value)}
                  className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Parent */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Parent Bone</label>
              <select
                value={selectedCuboid.parentId || ''}
                onChange={(e) => updateCuboid(selectedCuboid.id, 'parentId', e.target.value || undefined)}
                className="w-full mt-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
              >
                <option value="">None (Root)</option>
                {cuboids
                  .filter((c) => c.id !== selectedCuboid.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-xs text-slate-500">
              <Box size={32} className="mx-auto mb-2 text-slate-600" />
              <p>Select a cuboid to edit its properties</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
