/**
 * Centralised registry of every panel available in the dockable workspace.
 *
 * Each editor created across phases 1–7 must be listed here so users can
 * actually open it from the dock strip. Side and category drive the layout
 * grouping in DockLayout.
 */
import { lazy, Suspense, useState, type ComponentType } from 'react';
import {
  FolderTree, Box, Sliders, Terminal, Workflow, GitBranch, Search,
  Settings, Sword, Sparkles, ChefHat, Bug, Paintbrush, Package, Mountain,
  Layout as LayoutIcon, Film, Layers, Bot, FlaskConical, Globe, Puzzle,
  Gauge, Scroll, LayoutDashboard, Volume2, Loader2,
} from 'lucide-react';
import type { PanelConfig } from '../dock-layout';

// ===== Eagerly-loaded panels (small, always shown) =====
import { AssetExplorer } from '../panels/AssetExplorer';
import { CanvasWorkspace } from '../panels/CanvasWorkspace';
import { SmartInspector } from '../panels/SmartInspector';
import { Console } from '../panels/Console';
import { GitPanel } from '../git/GitPanel';
import { BlockListPanel, ItemListPanel } from './listPanels';
import {
  ConnectedRecipeEditor,
  ConnectedEntityEditor,
  ConnectedEnchantmentEditor,
  ConnectedBiomeEditor,
  ConnectedAdvancementEditor,
  ConnectedDimensionEditor,
} from './editorConnectors';
import { useProjectStore } from '../../stores/projectStore';
import { saveVisualGraph, isTauri } from '../../lib/tauri-api';
import { GeneratedCodeModal } from '../common/GeneratedCodeModal';
import { FeatureCatalog } from '../feature-catalog';
import type { Node, Edge } from '@xyflow/react';

// ===== Lazy-loaded panels (heavy: Three.js, React Flow, etc.) =====
// These only download their JS when the user opens the panel for the first time.
const NodeEditor = lazy(() => import('../node-editor').then(m => ({ default: m.NodeEditor })));
const ModelEditor3D = lazy(() => import('../editors-3d').then(m => ({ default: m.ModelEditor3D })));
const AnimationEditor = lazy(() => import('../editors-3d').then(m => ({ default: m.AnimationEditor })));
const PixelCanvas = lazy(() => import('../editors-2d').then(m => ({ default: m.PixelCanvas })));
const TextureEditorV2 = lazy(() => import('../editors-2d').then(m => ({ default: m.TextureEditorV2 })));
const BehaviorTreeEditor = lazy(() => import('../editors-ai').then(m => ({ default: m.BehaviorTreeEditor })));
const BiomeNoisePreview = lazy(() => import('../editors-world').then(m => ({ default: m.BiomeNoisePreview })));
const HudBuilder = lazy(() => import('../editors-world').then(m => ({ default: m.HudBuilder })));
const Profiler = lazy(() => import('../profiler').then(m => ({ default: m.Profiler })));
const AIAgentHub = lazy(() => import('../ai-system').then(m => ({ default: m.AIAgentHub })));
const TestRunner = lazy(() => import('../testing').then(m => ({ default: m.TestRunner })));
const MultiLoaderManager = lazy(() => import('../multi-loader').then(m => ({ default: m.MultiLoaderManager })));
const PluginMarketplace = lazy(() => import('../plugin-system').then(m => ({ default: m.PluginMarketplace })));
const ResourcePackStudio = lazy(() => import('../resource-pack/ResourcePackStudio').then(m => ({ default: m.ResourcePackStudio })));
const QuestEditor = lazy(() => import('../game-systems').then(m => ({ default: m.QuestEditor })));
const WorldGenEditor = lazy(() => import('../game-systems').then(m => ({ default: m.WorldGenEditor })));
const GUIBuilderPro = lazy(() => import('../game-systems').then(m => ({ default: m.GUIBuilderPro })));
const MultiplayerManager = lazy(() => import('../game-systems').then(m => ({ default: m.MultiplayerManager })));

// Suspense fallback shown while a panel chunk is downloading
function PanelLoading({ name }: { name: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 gap-2">
      <Loader2 size={20} className="animate-spin text-blue-400" />
      <span className="text-xs">Loading {name}…</span>
    </div>
  );
}

// Connector that wires NodeEditor save/generate callbacks to real Tauri commands.
//
// Save -> persists the graph to the SQLite `visual_nodes_data` table.
// Generate Java -> reads the saved graph back, runs it through the Rust
// `JavaEmitter` + `apply_all_safeguards`, and shows the result in
// `GeneratedCodeModal`. Saving first is required because the codegen
// command works from a graph_id, not from in-memory React Flow state.
function ConnectedNodeEditor() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);
  const [savedGraphId, setSavedGraphId] = useState<number | null>(null);
  const [showGeneratedCode, setShowGeneratedCode] = useState(false);

  const log = (
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    source = 'NodeEditor'
  ) =>
    addConsoleMessage({
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      source,
    });

  const persistGraph = async (nodes: Node[], edges: Edge[]): Promise<number | null> => {
    if (!currentProject) {
      log('warning', 'No project selected — cannot save graph', 'NodeEditor');
      return null;
    }
    if (!isTauri()) {
      log(
        'warning',
        'Desktop app required to persist visual graphs (browser fallback only logs)',
        'NodeEditor'
      );
      return null;
    }

    try {
      const id = await saveVisualGraph({
        id: savedGraphId ?? undefined,
        project_id: currentProject.id,
        graph_name: 'EventHandlers',
        graph_type: 'event_handler',
        nodes_json: JSON.stringify(nodes),
        edges_json: JSON.stringify(edges),
        viewport_json: '{}',
      });
      setSavedGraphId(id);
      return id;
    } catch (e) {
      log('error', `Failed to save graph: ${e}`, 'NodeEditor');
      return null;
    }
  };

  return (
    <>
      <NodeEditor
        onSave={async (nodes: Node[], edges: Edge[]) => {
          const id = await persistGraph(nodes, edges);
          if (id != null) {
            log(
              'success',
              `Visual graph saved (id=${id}, ${nodes.length} nodes, ${edges.length} edges)`
            );
          }
        }}
        onGenerateCode={async (nodes: Node[], edges: Edge[]) => {
          // Save first so the codegen has fresh data to work from.
          const id = await persistGraph(nodes, edges);
          if (id == null) {
            log('warning', 'Could not generate Java — graph save failed', 'CodeGen');
            return;
          }
          log('info', `Generating Java from ${nodes.length} nodes…`, 'CodeGen');
          setShowGeneratedCode(true);
        }}
      />

      {showGeneratedCode && savedGraphId != null && (
        <GeneratedCodeModal
          kind="graph"
          id={savedGraphId}
          onClose={() => setShowGeneratedCode(false)}
        />
      )}
    </>
  );
}

function withSuspense<P extends object>(Comp: ComponentType<P>, name: string) {
  return function Wrapped(props: P) {
    return (
      <Suspense fallback={<PanelLoading name={name} />}>
        <Comp {...props} />
      </Suspense>
    );
  };
}

// Pre-wrap each lazy editor so the panel registry can use plain JSX.
const NodeEditorPanel = withSuspense(ConnectedNodeEditor, 'Visual Script');
const ModelEditor3DPanel = withSuspense(ModelEditor3D, '3D Model Editor');
const AnimationEditorPanel = withSuspense(AnimationEditor, 'Animation Editor');
const PixelCanvasPanel = withSuspense(PixelCanvas, 'Pixel Canvas');
const TextureEditorV2Panel = withSuspense(TextureEditorV2, 'Texture Editor v2');
const BehaviorTreeEditorPanel = withSuspense(BehaviorTreeEditor, 'AI Behavior Tree');
const BiomeNoisePreviewPanel = withSuspense(BiomeNoisePreview, 'Biome Noise');
const HudBuilderPanel = withSuspense(HudBuilder, 'HUD Builder');
const ProfilerPanel = withSuspense(Profiler, 'Profiler');
const AIAgentHubPanel = withSuspense(AIAgentHub, 'AI Hub');
const TestRunnerPanel = withSuspense(TestRunner, 'Test Runner');
const MultiLoaderManagerPanel = withSuspense(MultiLoaderManager, 'Multi-Loader');
const PluginMarketplacePanel = withSuspense(PluginMarketplace, 'Plugin Marketplace');
const ResourcePackStudioPanel = withSuspense(ResourcePackStudio, 'Resource Pack Studio');
const QuestEditorPanel = withSuspense(QuestEditor, 'Quest Editor');
const WorldGenEditorPanel = withSuspense(WorldGenEditor, 'World Gen Editor');
const GUIBuilderProPanel = withSuspense(GUIBuilderPro, 'GUI Builder');
const MultiplayerManagerPanel = withSuspense(MultiplayerManager, 'Multiplayer');

export function createWorkspacePanels(): PanelConfig[] {
  return [
    // ===== Left dock: project / version control =====
    { id: 'asset-explorer', title: 'Assets', icon: FolderTree, component: <AssetExplorer />, closable: true, defaultVisible: true, dockSide: 'left', category: 'assets', minWidth: 200 },
    { id: 'git', title: 'Git', icon: GitBranch, component: <GitPanel />, closable: true, defaultVisible: true, dockSide: 'left', category: 'system', minWidth: 220 },
    { id: 'search', title: 'Search', icon: Search, component: <SearchPanel />, closable: true, defaultVisible: false, dockSide: 'left', category: 'tools' },

    // ===== Center: main canvas + console =====
    { id: 'canvas', title: 'Canvas', icon: Box, component: <CanvasWorkspace />, closable: false, defaultVisible: true, category: 'editor', minWidth: 400, minHeight: 300 },
    { id: 'console', title: 'Console', icon: Terminal, component: <Console />, closable: true, defaultVisible: true, category: 'system', minHeight: 100 },

    // ===== Content editors (shown in dock strip when not visible in mosaic) =====
    { id: 'block-editor', title: 'Blocks', icon: Box, component: <BlockListPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'item-editor', title: 'Items', icon: Sword, component: <ItemListPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'recipe-editor', title: 'Recipes', icon: ChefHat, component: <ConnectedRecipeEditor />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'entity-editor', title: 'Entities', icon: Bug, component: <ConnectedEntityEditor />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'enchantment-editor', title: 'Enchantments', icon: Sparkles, component: <ConnectedEnchantmentEditor />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'biome-editor', title: 'Biomes', icon: Mountain, component: <ConnectedBiomeEditor />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'dimension-editor', title: 'Dimensions', icon: Globe, component: <ConnectedDimensionEditor />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'advancement-editor', title: 'Advancements', icon: Sparkles, component: <ConnectedAdvancementEditor />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'node-editor', title: 'Visual Script', icon: Workflow, component: <NodeEditorPanel />, closable: true, defaultVisible: false, category: 'editor', minWidth: 500, minHeight: 300 },

    // ===== Visual / 3D / 2D editors =====
    { id: 'model-3d', title: '3D Model', icon: Package, component: <ModelEditor3DPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'animation', title: 'Animation', icon: Film, component: <AnimationEditorPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'pixel-canvas', title: 'Pixel Canvas', icon: Paintbrush, component: <PixelCanvasPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'texture-v2', title: 'Texture v2', icon: Layers, component: <TextureEditorV2Panel />, closable: true, defaultVisible: false, category: 'editor' },

    // ===== World / game systems =====
    { id: 'biome-noise', title: 'Biome Noise', icon: Mountain, component: <BiomeNoisePreviewPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'hud-builder', title: 'HUD Builder', icon: LayoutIcon, component: <HudBuilderPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'gui-builder', title: 'GUI Builder', icon: LayoutDashboard, component: <GUIBuilderProPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'world-gen', title: 'World Gen', icon: Globe, component: <WorldGenEditorPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'quests', title: 'Quests', icon: Scroll, component: <QuestEditorPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'multiplayer', title: 'Multiplayer', icon: Volume2, component: <MultiplayerManagerPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'behavior-tree', title: 'AI Behavior Tree', icon: Bug, component: <BehaviorTreeEditorPanel />, closable: true, defaultVisible: false, category: 'editor' },
    { id: 'resource-pack', title: 'Resource Pack', icon: Package, component: <ResourcePackStudioPanel />, closable: true, defaultVisible: false, category: 'editor' },

    // ===== System tools (right dock) =====
    { id: 'inspector', title: 'Inspector', icon: Sliders, component: <SmartInspector />, closable: true, defaultVisible: true, dockSide: 'right', category: 'inspector', minWidth: 220 },
    { id: 'feature-catalog', title: 'Features', icon: LayoutDashboard, component: <FeatureCatalog />, closable: true, defaultVisible: false, dockSide: 'right', category: 'system', minWidth: 360 },
    { id: 'profiler', title: 'Profiler', icon: Gauge, component: <ProfilerPanel />, closable: true, defaultVisible: false, dockSide: 'right', category: 'tools' },
    { id: 'tests', title: 'Tests', icon: FlaskConical, component: <TestRunnerPanel />, closable: true, defaultVisible: false, dockSide: 'right', category: 'tools' },
    { id: 'ai-hub', title: 'AI Hub', icon: Bot, component: <AIAgentHubPanel />, closable: true, defaultVisible: false, dockSide: 'right', category: 'tools' },
    { id: 'multi-loader', title: 'Multi-Loader', icon: Globe, component: <MultiLoaderManagerPanel />, closable: true, defaultVisible: false, dockSide: 'right', category: 'system' },
    { id: 'plugins', title: 'Plugins', icon: Puzzle, component: <PluginMarketplacePanel />, closable: true, defaultVisible: false, dockSide: 'right', category: 'system' },
    { id: 'settings', title: 'Settings', icon: Settings, component: <SettingsPanel />, closable: true, defaultVisible: false, dockSide: 'right', category: 'system' },
  ];
}

// ===== Lightweight inline panels =====

function SearchPanel() {
  return (
    <div className="w-full h-full p-3 bg-slate-900">
      <input
        type="text"
        placeholder="Search assets, blocks, items…"
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
      />
      <p className="text-[10px] text-slate-500 mt-2">Tip: press Ctrl+Shift+F for global search</p>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="w-full h-full p-3 bg-slate-900 text-xs space-y-3 overflow-y-auto">
      <div>
        <p className="font-bold text-slate-200 mb-2">Project</p>
        <div className="space-y-1.5 text-slate-400">
          <div className="flex justify-between"><span>MC Version</span><span className="text-white">1.20.4</span></div>
          <div className="flex justify-between"><span>Mod Loader</span><span className="text-white">Forge</span></div>
          <div className="flex justify-between"><span>Java Version</span><span className="text-white">17</span></div>
        </div>
      </div>
      <div>
        <p className="font-bold text-slate-200 mb-2">Editor</p>
        <div className="space-y-1.5 text-slate-400">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Auto-save</label>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Hot reload</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> Show grid</label>
        </div>
      </div>
    </div>
  );
}
