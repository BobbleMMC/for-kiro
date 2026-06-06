/**
 * DockWorkspace — Phase 1 Professional Dockable Workspace
 * Replaces the static PanelLayout with a fully dockable, drag-and-drop layout
 */
import { type FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { DockLayout, type PanelConfig } from '../dock-layout';
import { WorkspaceHeader } from '../layout/WorkspaceHeader';
import { AssetExplorer } from '../panels/AssetExplorer';
import { CanvasWorkspace } from '../panels/CanvasWorkspace';
import { SmartInspector } from '../panels/SmartInspector';
import { Console } from '../panels/Console';
import { NodeEditor } from '../node-editor';
import { HotReloadStatus } from '../hot-reload/HotReloadStatus';
import { GitPanel } from '../git/GitPanel';
import '../dock-layout/dock-styles.css';

import {
  FolderTree,
  Box,
  Settings,
  Terminal,
  Workflow,
  GitBranch,
  Search,
  Sliders,
} from 'lucide-react';

// Define all available panels
const createPanels = (): PanelConfig[] => [
  {
    id: 'asset-explorer',
    title: 'Asset Explorer',
    icon: FolderTree,
    component: <AssetExplorer />,
    closable: true,
    defaultVisible: true,
    minWidth: 200,
  },
  {
    id: 'canvas',
    title: 'Canvas',
    icon: Box,
    component: <CanvasWorkspace />,
    closable: false,
    defaultVisible: true,
    minWidth: 400,
    minHeight: 300,
  },
  {
    id: 'node-editor',
    title: 'Node Editor',
    icon: Workflow,
    component: <NodeEditor />,
    closable: true,
    defaultVisible: false,
    minWidth: 500,
    minHeight: 300,
  },
  {
    id: 'inspector',
    title: 'Inspector',
    icon: Sliders,
    component: <SmartInspector />,
    closable: true,
    defaultVisible: true,
    minWidth: 220,
  },
  {
    id: 'console',
    title: 'Console',
    icon: Terminal,
    component: <Console />,
    closable: true,
    defaultVisible: true,
    minHeight: 100,
  },
  {
    id: 'git',
    title: 'Git',
    icon: GitBranch,
    component: <GitPanel />,
    closable: true,
    defaultVisible: true,
    minWidth: 200,
  },
  {
    id: 'properties',
    title: 'Properties',
    icon: Settings,
    component: (
      <div className="w-full h-full p-4 bg-slate-900 text-slate-400 text-xs">
        <p className="font-bold text-slate-300 mb-2">Properties Panel</p>
        <p>Select an element to view its properties.</p>
      </div>
    ),
    closable: true,
    defaultVisible: false,
  },
  {
    id: 'search',
    title: 'Search',
    icon: Search,
    component: (
      <div className="w-full h-full p-4 bg-slate-900">
        <input
          type="text"
          placeholder="Search assets, blocks, items..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
        />
        <p className="text-[10px] text-slate-500 mt-2">Ctrl+Shift+F for global search</p>
      </div>
    ),
    closable: true,
    defaultVisible: false,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    component: (
      <div className="w-full h-full p-4 bg-slate-900 text-slate-400 text-xs">
        <p className="font-bold text-slate-300 mb-2">Project Settings</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>MC Version:</span>
            <span className="text-white">1.20.4</span>
          </div>
          <div className="flex justify-between">
            <span>Mod Loader:</span>
            <span className="text-white">Forge</span>
          </div>
          <div className="flex justify-between">
            <span>Java Version:</span>
            <span className="text-white">17</span>
          </div>
        </div>
      </div>
    ),
    closable: true,
    defaultVisible: false,
  },
];

export const DockWorkspace: FC = () => {
  const { currentProject } = useProjectStore();

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">No project selected</h2>
          <p className="text-slate-400">Select a project from the dashboard to start editing</p>
        </div>
      </div>
    );
  }

  const panels = createPanels();

  return (
    <DockLayout
      panels={panels}
      headerContent={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200">{currentProject.name}</span>
              <span className="text-[9px] text-slate-500 ml-2">Minecraft Mod Studio</span>
            </div>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <HotReloadStatus />
        </div>
      }
    />
  );
};
