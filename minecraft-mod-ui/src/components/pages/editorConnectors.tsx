/**
 * Editor connectors — bridge the legacy single-asset editors to the
 * project store and (for those wired up so far) to the SQLite-backed
 * Tauri commands.
 *
 * The editors in src/components/editors still use their own local types
 * (Recipe, Entity, Enchantment, Biome, Advancement) which differ from
 * the canonical types in src/types. Until those are unified, these
 * connectors:
 *
 *   - render the editor with its onSave callback
 *   - persist the result to the DB when a Tauri-backed flow exists
 *     (today: Recipe)
 *   - fall back to a console-log toast otherwise
 *
 * The Recipe connector also offers a 'Generate JSON' modal that calls
 * generate_recipe_json after save and shows the produced Minecraft
 * recipe JSON in the existing CodePreview-based modal.
 */
import { useCallback, useState, type FC } from 'react';
import { Loader2, AlertTriangle, X, FileJson } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import {
  RecipeEditor,
  EntityEditor,
  EnchantmentEditor,
  BiomeEditor,
  AdvancementEditor,
  type Recipe as EditorRecipeType,
} from '../editors';
import {
  createRecipe as tauriCreateRecipe,
  generateRecipeJson,
  isTauri,
  writeGeneratedFile,
  type GeneratedFile,
} from '../../lib/tauri-api';
import { recipeToTauri } from '../../lib/tauri-mappers';
import { CodePreview } from '../common/CodePreview';

function useSaveLogger(assetType: string) {
  const { addConsoleMessage } = useProjectStore();
  return useCallback(
    (asset: { id?: string | number; display_name?: string; name?: string }) => {
      const label = asset.display_name || asset.name || String(asset.id) || 'unnamed';
      addConsoleMessage({
        id: `msg-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level: 'success',
        message: `${assetType} saved: ${label}`,
        source: assetType,
      });
    },
    [addConsoleMessage, assetType]
  );
}

// ============================================================================
// Recipe — persisted + JSON codegen
// ============================================================================

interface RecipeJsonModalState {
  file: GeneratedFile;
  writing: boolean;
  writtenAt: string | null;
  writeError: string | null;
}

export const ConnectedRecipeEditor: FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);
  const [modal, setModal] = useState<RecipeJsonModalState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const log = (
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    source = 'Recipe'
  ) =>
    addConsoleMessage({
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      source,
    });

  const handleSave = useCallback(
    async (recipe: EditorRecipeType) => {
      if (!currentProject) {
        log('warning', 'No project selected — recipe not saved');
        return;
      }
      const label = recipe.name || 'unnamed';

      if (!isTauri()) {
        log('success', `Recipe saved (in-memory only): ${label}`);
        return;
      }

      try {
        const id = await tauriCreateRecipe(recipeToTauri(currentProject.id, recipe));
        log('success', `Recipe saved (id=${id}): ${label}`);
        setError(null);

        // Immediately generate the JSON so the user sees what Minecraft will receive.
        try {
          const file = await generateRecipeJson(id);
          setModal({ file, writing: false, writtenAt: null, writeError: null });
        } catch (gen) {
          // Save succeeded; codegen failures are non-fatal but visible.
          log('warning', `Recipe saved but JSON codegen failed: ${gen}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log('error', `Failed to save recipe: ${msg}`);
        setError(msg);
      }
    },
    [currentProject]
  );

  const handleWriteToDisk = async () => {
    if (!modal || !currentProject) return;
    setModal({ ...modal, writing: true, writeError: null });
    try {
      const result = await writeGeneratedFile({
        project_id: currentProject.id,
        package_path: modal.file.package_path,
        file_name: modal.file.file_name,
        source: modal.file.source,
      });
      setModal({ ...modal, writing: false, writtenAt: result.relative_path });
      log('success', `Recipe JSON written to ${result.relative_path}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setModal({ ...modal, writing: false, writeError: msg });
    }
  };

  return (
    <>
      <RecipeEditor onSave={handleSave as never} />

      {error && (
        <div className="absolute top-2 right-2 z-40 flex items-start gap-2 px-3 py-2 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 text-xs max-w-sm">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FileJson size={16} className="text-blue-400" />
                <span className="text-sm font-bold text-slate-100">
                  Generated Recipe JSON
                </span>
                <span className="text-xs font-mono text-slate-500 ml-2">
                  {modal.file.package_path}/{modal.file.file_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleWriteToDisk()}
                  disabled={modal.writing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded"
                >
                  {modal.writing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Write to project
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="px-3 py-1.5 hover:bg-slate-700 text-slate-300 text-xs rounded"
                >
                  Close
                </button>
              </div>
            </div>

            {modal.writtenAt && !modal.writeError && (
              <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-700/40 text-emerald-200 text-xs">
                Written to <span className="font-mono">{modal.writtenAt}</span>
              </div>
            )}
            {modal.writeError && (
              <div className="px-5 py-2 bg-red-950/40 border-b border-red-700/40 text-red-200 text-xs">
                {modal.writeError}
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              <CodePreview
                code={modal.file.source}
                language="json"
                title={modal.file.file_name}
                fileName={modal.file.file_name}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================================
// Other editors — still console-toast only (will be ported in PR #18+)
// ============================================================================

export const ConnectedEntityEditor: FC = () => {
  const onSave = useSaveLogger('Entity');
  return <EntityEditor onSave={onSave as never} />;
};

export const ConnectedEnchantmentEditor: FC = () => {
  const onSave = useSaveLogger('Enchantment');
  return <EnchantmentEditor onSave={onSave as never} />;
};

export const ConnectedBiomeEditor: FC = () => {
  const onSave = useSaveLogger('Biome');
  return <BiomeEditor onSave={onSave as never} />;
};

export const ConnectedAdvancementEditor: FC = () => {
  const onSave = useSaveLogger('Advancement');
  return <AdvancementEditor onSave={onSave as never} />;
};
