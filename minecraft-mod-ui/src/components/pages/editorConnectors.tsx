/**
 * Editor connectors — bridge the legacy single-asset editors to the
 * project store, the SQLite-backed registry, and the per-feature codegen
 * commands.
 *
 * Each Connected* component:
 *   1. Renders the legacy editor with its own local type.
 *   2. On save, serialises the editor payload into the `registry` table
 *      via `saveAsset` (or, for Recipe, the dedicated recipes table).
 *   3. Immediately runs the matching codegen command.
 *   4. Opens an `AssetCodeModal` that previews the generated file and
 *      offers a 'Write to project' button using `writeGeneratedFile`.
 *
 * The Recipe flow uses the dedicated recipes table because it pre-dates
 * the generic registry abstraction; the four world-data flows (Entity,
 * Biome, Dimension, Advancement) all go through the registry.
 */
import { useCallback, useState, type FC, type ReactNode } from 'react';
import { Loader2, AlertTriangle, X, FileJson, FileCode } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import {
  RecipeEditor,
  EntityEditor,
  EnchantmentEditor,
  BiomeEditor,
  AdvancementEditor,
  DimensionEditor,
  type Recipe as EditorRecipeType,
  type Entity as EditorEntityType,
  type Biome as EditorBiomeType,
  type Advancement as EditorAdvancementType,
  type Dimension as EditorDimensionType,
} from '../editors';
import {
  createRecipe as tauriCreateRecipe,
  generateRecipeJson,
  saveAsset,
  generateEntityClass,
  generateBiomeJson,
  generateDimensionJson,
  generateAdvancementJson,
  generateEnchantmentClass,
  isTauri,
  writeGeneratedFile,
  type GeneratedFile,
} from '../../lib/tauri-api';
import { recipeToTauri } from '../../lib/tauri-mappers';
import { CodePreview } from '../common/CodePreview';
import type { Project } from '../../types';

// ============================================================================
// Shared modal — one screen, many feature kinds
// ============================================================================

interface ModalState {
  file: GeneratedFile;
  language: 'java' | 'json';
  writing: boolean;
  writtenAt: string | null;
  writeError: string | null;
}

interface AssetCodeModalProps {
  state: ModalState;
  title: string;
  onClose: () => void;
  onWrite: () => void;
}

const AssetCodeModal: FC<AssetCodeModalProps> = ({ state, title, onClose, onWrite }) => {
  const Icon = state.language === 'java' ? FileCode : FileJson;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-100">{title}</span>
            <span className="text-xs font-mono text-slate-500 ml-2">
              {state.file.package_path}/{state.file.file_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onWrite}
              disabled={state.writing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded"
            >
              {state.writing ? <Loader2 size={12} className="animate-spin" /> : null}
              Write to project
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 hover:bg-slate-700 text-slate-300 text-xs rounded"
            >
              Close
            </button>
          </div>
        </div>

        {state.writtenAt && !state.writeError && (
          <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-700/40 text-emerald-200 text-xs">
            Written to <span className="font-mono">{state.writtenAt}</span>
          </div>
        )}
        {state.writeError && (
          <div className="px-5 py-2 bg-red-950/40 border-b border-red-700/40 text-red-200 text-xs">
            {state.writeError}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <CodePreview
            code={state.file.source}
            language={state.language}
            title={state.file.file_name}
            fileName={state.file.file_name}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Generic save+codegen pipeline
// ============================================================================

interface UseAssetSaveOptions {
  assetType: 'entity' | 'biome' | 'dimension' | 'advancement';
  modalTitle: string;
  language: 'java' | 'json';
  generate: (assetId: number) => Promise<GeneratedFile>;
  /** Pull a stable identifier and metadata payload out of the editor's local type. */
  extract: (raw: unknown) => { name: string; displayName?: string; metadata: object };
}

function useAssetSave(opts: UseAssetSaveOptions) {
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const log = (
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    source = capitalize(opts.assetType)
  ) =>
    addConsoleMessage({
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      source,
    });

  const handleSave = useCallback(
    async (raw: unknown) => {
      if (!currentProject) {
        log('warning', `No project selected — ${opts.assetType} not saved`);
        return;
      }
      const { name, displayName, metadata } = opts.extract(raw);
      const safeName = sanitizeName(name) || `${opts.assetType}_${Date.now()}`;
      const label = displayName || safeName;

      if (!isTauri()) {
        log('success', `${capitalize(opts.assetType)} saved (in-memory only): ${label}`);
        return;
      }

      try {
        const id = await saveAsset({
          project_id: currentProject.id,
          asset_type: opts.assetType,
          asset_name: safeName,
          namespace: currentProject.namespace,
          display_name: displayName,
          metadata: JSON.stringify(metadata),
        });
        log('success', `${capitalize(opts.assetType)} saved (id=${id}): ${label}`);
        setError(null);

        try {
          const file = await opts.generate(id);
          setModal({
            file,
            language: opts.language,
            writing: false,
            writtenAt: null,
            writeError: null,
          });
        } catch (gen) {
          log('warning', `${capitalize(opts.assetType)} saved but codegen failed: ${gen}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log('error', `Failed to save ${opts.assetType}: ${msg}`);
        setError(msg);
      }
    },
    [currentProject, opts.assetType] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleWriteToDisk = useCallback(async () => {
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
      log('success', `${capitalize(opts.assetType)} file written to ${result.relative_path}`);
    } catch (e) {
      setModal({
        ...modal,
        writing: false,
        writeError: e instanceof Error ? e.message : String(e),
      });
    }
  }, [modal, currentProject, opts.assetType]); // eslint-disable-line react-hooks/exhaustive-deps

  const ui = (
    <>
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
        <AssetCodeModal
          state={modal}
          title={opts.modalTitle}
          onClose={() => setModal(null)}
          onWrite={() => void handleWriteToDisk()}
        />
      )}
    </>
  );

  return { handleSave, ui };
}

function sanitizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// ============================================================================
// Recipe — uses the dedicated recipes table (different shape from registry)
// ============================================================================

export const ConnectedRecipeEditor: FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);
  const [modal, setModal] = useState<ModalState | null>(null);
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
        try {
          const file = await generateRecipeJson(id);
          setModal({
            file,
            language: 'json',
            writing: false,
            writtenAt: null,
            writeError: null,
          });
        } catch (gen) {
          log('warning', `Recipe saved but JSON codegen failed: ${gen}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log('error', `Failed to save recipe: ${msg}`);
        setError(msg);
      }
    },
    [currentProject] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleWriteToDisk = useCallback(async () => {
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
      setModal({
        ...modal,
        writing: false,
        writeError: e instanceof Error ? e.message : String(e),
      });
    }
  }, [modal, currentProject]);

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
        <AssetCodeModal
          state={modal}
          title="Generated Recipe JSON"
          onClose={() => setModal(null)}
          onWrite={() => void handleWriteToDisk()}
        />
      )}
    </>
  );
};

// ============================================================================
// Entity — generic registry path
// ============================================================================

export const ConnectedEntityEditor: FC = () => {
  const { handleSave, ui } = useAssetSave({
    assetType: 'entity',
    modalTitle: 'Generated Entity Class',
    language: 'java',
    generate: generateEntityClass,
    extract: (raw) => {
      const e = raw as EditorEntityType;
      // The legacy EntityEditor type uses `name`, `display_name`, `entity_type`,
      // `health`, `armor_value`, `attack_damage`, `movement_speed`, `follow_range`,
      // and several spawn fields. We only feed the codegen what it consumes.
      return {
        name: e.name ?? '',
        displayName: e.display_name ?? e.name,
        metadata: {
          name: e.name,
          display_name: e.display_name,
          entity_type: e.type ?? 'passive',
          max_health: e.health ?? 20,
          armor: e.armor_value ?? 0,
          attack_damage: e.attack_damage ?? 0,
          movement_speed: e.movement_speed ?? 0.3,
          follow_range: e.follow_range ?? 16,
          drops: e.drops ?? [],
        },
      };
    },
  });
  return (
    <>
      <EntityEditor onSave={handleSave as never} />
      {ui}
    </>
  );
};

// ============================================================================
// Enchantment — generic registry path
// ============================================================================

interface EditorEnchantmentType {
  id?: string | number;
  name?: string;
  display_name?: string;
  description?: string;
  max_level?: number;
  is_treasure?: boolean;
  is_curse?: boolean;
  can_anvil_merge?: boolean;
  anvil_cost?: number;
  weight?: number;
  applies_to?: string;
}

export const ConnectedEnchantmentEditor: FC = () => {
  const { handleSave, ui } = useAssetSave({
    assetType: 'enchantment',
    modalTitle: 'Generated Enchantment Class',
    language: 'java',
    generate: generateEnchantmentClass,
    extract: (raw) => {
      const e = raw as EditorEnchantmentType;
      return {
        name: (e.name as string | undefined) ?? '',
        displayName: e.display_name ?? e.name,
        metadata: {
          name: e.name,
          display_name: e.display_name,
          description: e.description ?? '',
          max_level: e.max_level ?? 3,
          is_treasure: e.is_treasure ?? false,
          is_curse: e.is_curse ?? false,
          can_anvil_merge: e.can_anvil_merge ?? true,
          anvil_cost: e.anvil_cost ?? 4,
          weight: e.weight ?? 10,
          applies_to: e.applies_to ?? 'BREAKABLE',
        },
      };
    },
  });
  return (
    <>
      <EnchantmentEditor onSave={handleSave as never} />
      {ui}
    </>
  );
};

// ============================================================================
// Biome — generic registry path
// ============================================================================

export const ConnectedBiomeEditor: FC = () => {
  const { handleSave, ui } = useAssetSave({
    assetType: 'biome',
    modalTitle: 'Generated Biome JSON',
    language: 'json',
    generate: generateBiomeJson,
    extract: (raw) => {
      const b = raw as EditorBiomeType;
      const effects = (b.effects ?? {}) as {
        fog_color?: number;
        water_color?: number;
        water_fog_color?: number;
        sky_color?: number;
        grass_color?: number;
        foliage_color?: number;
      };
      return {
        name: b.name ?? '',
        displayName: b.display_name ?? b.name,
        metadata: {
          name: b.name,
          temperature: b.temperature ?? 0.7,
          downfall: b.downfall ?? 0.4,
          fog_color: effects.fog_color ?? 0xc0d8ff,
          water_color: effects.water_color ?? 0x3f76e4,
          water_fog_color: effects.water_fog_color ?? 0x050533,
          sky_color: effects.sky_color ?? 0x78a7ff,
          grass_color: effects.grass_color ?? 0x91bd59,
          foliage_color: effects.foliage_color ?? 0x77ab2f,
          precipitation: b.precipitation ?? 'rain',
        },
      };
    },
  });
  return (
    <>
      <BiomeEditor onSave={handleSave as never} />
      {ui}
    </>
  );
};

// ============================================================================
// Dimension — generic registry path. The legacy DimensionEditor exposes
// (kind, generator, biome_source, default_biome) — we map those to the
// metadata shape the Rust generator expects.
// ============================================================================

export const ConnectedDimensionEditor: FC = () => {
  const { handleSave, ui } = useAssetSave({
    assetType: 'dimension',
    modalTitle: 'Generated Dimension JSON',
    language: 'json',
    generate: generateDimensionJson,
    extract: (raw) => {
      const d = raw as EditorDimensionType & {
        dimension_type?: string;
        generator_type?: string;
        biome_source?: string;
        fixed_biome?: string;
      };
      return {
        name: (d.name as string | undefined) ?? '',
        displayName: (d.display_name as string | undefined) ?? d.name,
        metadata: {
          name: d.name,
          dimension_type: d.dimension_type ?? 'minecraft:overworld',
          generator_type: d.generator_type ?? 'noise',
          biome_source: d.biome_source ?? 'fixed',
          fixed_biome: d.fixed_biome ?? 'minecraft:plains',
        },
      };
    },
  });
  return (
    <>
      <DimensionEditor onSave={handleSave as never} />
      {ui}
    </>
  );
};

// ============================================================================
// Advancement — generic registry path
// ============================================================================

export const ConnectedAdvancementEditor: FC = () => {
  const { handleSave, ui } = useAssetSave({
    assetType: 'advancement',
    modalTitle: 'Generated Advancement JSON',
    language: 'json',
    generate: generateAdvancementJson,
    extract: (raw) => {
      const a = raw as EditorAdvancementType;
      return {
        name: a.name ?? '',
        displayName: a.title ?? a.name,
        metadata: {
          title: a.title ?? a.name,
          description: a.description ?? '',
          icon: a.icon ?? 'minecraft:grass_block',
          frame: a.frame ?? 'task',
          parent: a.parent ?? null,
          show_toast: a.show_toast ?? true,
          announce_to_chat: a.announce_to_chat ?? true,
          hidden: a.hidden ?? false,
          criteria: a.criteria ?? {
            got_block: {
              trigger: 'minecraft:inventory_changed',
              conditions: { items: [{ items: ['minecraft:dirt'] }] },
            },
          },
        },
      };
    },
  });
  return (
    <>
      <AdvancementEditor onSave={handleSave as never} />
      {ui}
    </>
  );
};

/* eslint-disable @typescript-eslint/no-unused-vars */
type _EnsureProjectShape = Project; // keeps the import alive for future flows
type _EnsureNodeShape = ReactNode;
