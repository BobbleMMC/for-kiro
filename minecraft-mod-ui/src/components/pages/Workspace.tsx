import { useState, type FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { PanelLayout } from '../layout/PanelLayout';
import { WorkspaceHeader } from '../layout/WorkspaceHeader';
import { AssetExplorer } from '../panels/AssetExplorer';
import { CanvasWorkspace } from '../panels/CanvasWorkspace';
import { SmartInspector } from '../panels/SmartInspector';
import { Console } from '../panels/Console';
import { RecipeEditor } from '../editors/RecipeEditor';
import { EntityEditor } from '../editors/EntityEditor';
import { EnchantmentEditor } from '../editors/EnchantmentEditor';
import { NodeEditor } from '../node-editor';
import { ModelEditor3D } from '../editors-3d';
import { PixelCanvas } from '../editors-2d';
import { BehaviorTreeEditor } from '../editors-ai';
import { BiomeNoisePreview, HudBuilder } from '../editors-world';
import type { Node, Edge } from '@xyflow/react';

export type EditorMode =
  | 'default'
  | 'recipe'
  | 'entity'
  | 'enchantment'
  | 'block'
  | 'item'
  | 'node-editor'
  | 'model-3d'
  | 'texture-2d'
  | 'behavior-tree'
  | 'biome-noise'
  | 'hud-builder';

export const Workspace: FC = () => {
  const { currentProject, addConsoleMessage } = useProjectStore();
  const [editorMode, setEditorMode] = useState<EditorMode>('default');
  const [_selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            No project selected
          </h2>
          <p className="text-slate-400">
            Select a project from the dashboard to start editing
          </p>
        </div>
      </div>
    );
  }

  // Handle node editor save
  const handleNodeEditorSave = (nodes: Node[], edges: Edge[]) => {
    const graphData = {
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    };
    console.log('Saving graph:', graphData);
    addConsoleMessage({
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      level: 'success',
      message: `Visual graph saved (${nodes.length} nodes, ${edges.length} edges)`,
      source: 'NodeEditor',
    });
  };

  // Handle code generation from node editor
  const handleGenerateCode = (nodes: Node[], edges: Edge[]) => {
    console.log('Generating Java from:', { nodes: nodes.length, edges: edges.length });
    addConsoleMessage({
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      level: 'info',
      message: `Generating Java code from ${nodes.length} nodes...`,
      source: 'CodeGen',
    });
  };

  // Render appropriate canvas content based on editor mode
  const renderCanvas = () => {
    switch (editorMode) {
      case 'recipe':
        return <RecipeEditor />;
      case 'entity':
        return <EntityEditor />;
      case 'enchantment':
        return <EnchantmentEditor />;
      case 'node-editor':
        return (
          <NodeEditor
            onSave={handleNodeEditorSave}
            onGenerateCode={handleGenerateCode}
          />
        );
      case 'model-3d':
        return <ModelEditor3D />;
      case 'texture-2d':
        return <PixelCanvas />;
      case 'behavior-tree':
        return <BehaviorTreeEditor />;
      case 'biome-noise':
        return <BiomeNoisePreview />;
      case 'hud-builder':
        return <HudBuilder />;
      default:
        return <CanvasWorkspace onOpenNodeEditor={() => setEditorMode('node-editor')} />;
    }
  };

  // Full-width editors (no sidebars needed)
  const isFullWidthEditor = ['model-3d', 'texture-2d', 'behavior-tree', 'biome-noise', 'hud-builder'].includes(editorMode);

  if (isFullWidthEditor) {
    return (
      <div className="flex flex-col h-full">
        <WorkspaceHeader
          projectName={currentProject.name}
          editorMode={editorMode}
          onEditorModeChange={setEditorMode}
          onSave={() => console.log('Saving project...')}
          onBuild={() => console.log('Building project...')}
          onExport={() => console.log('Exporting project...')}
        />
        <div className="flex-1 overflow-hidden">
          {renderCanvas()}
        </div>
      </div>
    );
  }

  return (
    <PanelLayout
      header={
        <WorkspaceHeader
          projectName={currentProject.name}
          editorMode={editorMode}
          onEditorModeChange={setEditorMode}
          onSave={() => console.log('Saving project...')}
          onBuild={() => console.log('Building project...')}
          onExport={() => console.log('Exporting project...')}
        />
      }
      assetExplorer={<AssetExplorer />}
      canvas={renderCanvas()}
      inspector={<SmartInspector />}
      console={<Console />}
    />
  );
};
