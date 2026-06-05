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

type EditorMode = 'default' | 'recipe' | 'entity' | 'enchantment' | 'block' | 'item';

export const Workspace: FC = () => {
  const { currentProject } = useProjectStore();
  const [editorMode, setEditorMode] = useState<EditorMode>('default');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

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

  // Render appropriate canvas content based on editor mode
  const renderCanvas = () => {
    switch (editorMode) {
      case 'recipe':
        return <RecipeEditor />;
      case 'entity':
        return <EntityEditor />;
      case 'enchantment':
        return <EnchantmentEditor />;
      default:
        return <CanvasWorkspace />;
    }
  };

  return (
    <PanelLayout
      header={
        <WorkspaceHeader
          projectName={currentProject.name}
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
