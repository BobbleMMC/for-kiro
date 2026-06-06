import { FC, useState } from 'react';
import { Save, Play, Download, Settings, Menu, X, Sun, Moon, Workflow, Box, Sword, Sparkles, ChefHat, Bug, Paintbrush, Package, GitBranch, Mountain, Layout } from 'lucide-react';
import type { EditorMode } from '../pages/Workspace';

interface WorkspaceHeaderProps {
  projectName?: string;
  isDarkMode?: boolean;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  onToggleDarkMode?: () => void;
  onSave?: () => void;
  onBuild?: () => void;
  onExport?: () => void;
}

const editorTabs: { mode: EditorMode; label: string; icon: typeof Box }[] = [
  { mode: 'default', label: 'Overview', icon: Box },
  { mode: 'node-editor', label: 'Node Editor', icon: Workflow },
  { mode: 'block', label: 'Blocks', icon: Box },
  { mode: 'item', label: 'Items', icon: Sword },
  { mode: 'recipe', label: 'Recipes', icon: ChefHat },
  { mode: 'entity', label: 'Entities', icon: Bug },
  { mode: 'enchantment', label: 'Enchants', icon: Sparkles },
  { mode: 'model-3d', label: '3D Model', icon: Package },
  { mode: 'texture-2d', label: 'Texture', icon: Paintbrush },
  { mode: 'behavior-tree', label: 'AI Tree', icon: GitBranch },
  { mode: 'biome-noise', label: 'Biome', icon: Mountain },
  { mode: 'hud-builder', label: 'HUD', icon: Layout },
];

export const WorkspaceHeader: FC<WorkspaceHeaderProps> = ({
  projectName = 'Untitled Project',
  isDarkMode = true,
  editorMode = 'default',
  onEditorModeChange = () => {},
  onToggleDarkMode = () => {},
  onSave = () => {},
  onBuild = () => {},
  onExport = () => {},
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Project Name & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">{projectName}</h1>
            <p className="text-xs text-slate-500">Minecraft Mod Studio</p>
          </div>
        </div>

        {/* Center: Main Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            title="Save Project (Ctrl+S)"
          >
            <Save size={16} />
            <span>Save</span>
          </button>

          <button
            onClick={onBuild}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            title="Build & Run"
          >
            <Play size={16} />
            <span>Build</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            title="Export .jar"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          <div className="h-6 w-px bg-slate-600 mx-1" />

          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Right: Mobile Menu */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-700 bg-slate-750 p-3 space-y-2">
          <button
            onClick={() => { onSave(); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={16} /> Save
          </button>
          <button
            onClick={() => { onBuild(); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Play size={16} /> Build
          </button>
          <button
            onClick={() => { onExport(); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download size={16} /> Export
          </button>
        </div>
      )}

      {/* Editor Tabs Bar */}
      <div className="px-4 py-1 bg-slate-850 border-t border-slate-700 flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {editorTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = editorMode === tab.mode;
          return (
            <button
              key={tab.mode}
              onClick={() => onEditorModeChange(tab.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Ready</span>
        </div>
        <span>Tauri v2 + Forge 1.20.4</span>
      </div>
    </header>
  );
};
