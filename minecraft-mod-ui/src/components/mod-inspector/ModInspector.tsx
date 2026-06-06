/**
 * Mod Inspector — opens an existing `.jar` or `.zip` and renders its
 * inventory: metadata header, feature counts, file lists per kind,
 * Java package tree, dependency list.
 *
 * Backed by the Rust `import_mod_or_pack` Tauri command which parses the
 * archive without permanently unpacking it, so opening a 200 MB pack is
 * fast and does not pollute the disk.
 *
 * Each file row in a feature list also offers a one-click "Extract"
 * button that calls `extract_jar_file` with a folder picker target.
 */

import { useState, type FC } from 'react';
import {
  FolderOpen,
  Loader2,
  AlertTriangle,
  Box,
  Sword,
  Layers,
  Image as ImageIcon,
  ScrollText,
  Award,
  Trees,
  Globe,
  FileCode,
  Package,
  ExternalLink,
  Search,
  Download,
} from 'lucide-react';
import {
  importModOrPack,
  extractJarFile,
  isTauri,
  type ImportArchiveResult,
  type ImportedMod,
  type ImportedModpack,
} from '../../lib/tauri-api';
import { useProjectStore } from '../../stores/projectStore';

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

export const ModInspector: FC = () => {
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportArchiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const log = (
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    source = 'ModInspector'
  ) =>
    addConsoleMessage({
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      source,
    });

  const pickAndOpen = async () => {
    if (!isTauri()) {
      setError('Mod Inspector requires the desktop app (browser dev mode has no file picker).');
      return;
    }
    setError(null);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        title: 'Open Mod or Modpack',
        multiple: false,
        filters: [
          { name: 'Mod / Modpack', extensions: ['jar', 'zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      setPath(selected);
      setLoading(true);
      const res = await importModOrPack(selected);
      setResult(res);
      const summary =
        res.kind === 'mod'
          ? `${res.Mod.display_name} (${res.Mod.loader}) — ${
              res.Mod.feature_counts.blockstates +
              res.Mod.feature_counts.models_block +
              res.Mod.feature_counts.recipes +
              res.Mod.feature_counts.loot_tables
            } feature files, ${res.Mod.total_classes} classes`
          : `Modpack: ${res.Modpack.name} v${res.Modpack.version} (${res.Modpack.format}) — ${res.Modpack.mod_count} mods`;
      log('success', `Imported ${selected}`, 'ModInspector');
      log('info', summary, 'ModInspector');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      log('error', `Import failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const extract = async (internalPath: string) => {
    if (!path || !isTauri()) return;
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const targetDir = await open({
        title: `Extract ${internalPath}`,
        directory: true,
        multiple: false,
      });
      if (!targetDir || Array.isArray(targetDir)) return;
      const written = await extractJarFile({
        jar_path: path,
        internal_path: internalPath,
        target_dir: targetDir,
      });
      log('success', `Extracted to ${written}`);
    } catch (e) {
      log('error', `Extract failed: ${e}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <span className="text-sm font-bold">Mod Inspector</span>
        {result && result.kind === 'mod' && (
          <span className="text-[10px] text-slate-400">
            {result.Mod.loader} · {result.Mod.minecraft_version_range || '—'}
          </span>
        )}
        <div className="flex-1" />
        {result && (
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter files…"
              className="pl-7 pr-3 py-1 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded text-xs text-slate-200 placeholder-slate-500 outline-none w-56"
            />
          </div>
        )}
        <button
          onClick={() => void pickAndOpen()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
          Open .jar / .zip
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/40 bg-red-950/30 text-red-200 text-sm">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">Import failed</div>
              <div className="text-xs text-red-300/80">{error}</div>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <FolderOpen size={32} />
            <div className="text-sm font-medium text-slate-400">No archive opened</div>
            <div className="text-xs max-w-md text-center">
              Click <strong>Open .jar / .zip</strong> to inspect any Minecraft mod or modpack —
              the inspector reads the archive without unpacking it and shows every block, item,
              recipe, model, language file, and Java class inside.
            </div>
          </div>
        )}

        {result?.kind === 'mod' && <ModView mod={result.Mod} filter={filter} onExtract={extract} />}
        {result?.kind === 'modpack' && <ModpackView pack={result.Modpack} />}
      </div>
    </div>
  );
};

// ============================================================================
// Mod view
// ============================================================================

const KIND_ICON: Record<string, typeof Box> = {
  blockstates: Box,
  models_block: Layers,
  models_item: Sword,
  textures_block: ImageIcon,
  textures_item: ImageIcon,
  textures_entity: ImageIcon,
  recipes: ScrollText,
  loot_tables: ScrollText,
  advancements: Award,
  structures: Trees,
  biomes: Trees,
  dimensions: Globe,
  worldgen_features: Trees,
  lang_files: FileCode,
  sounds: FileCode,
  mixins: FileCode,
  jei_plugins: Package,
};

const ModView: FC<{
  mod: ImportedMod;
  filter: string;
  onExtract: (path: string) => void;
}> = ({ mod, filter, onExtract }) => {
  const fc = mod.feature_counts;
  const headlineCounts: Array<{ key: string; label: string; count: number }> = [
    { key: 'blockstates', label: 'Blocks', count: fc.blockstates },
    { key: 'models_item', label: 'Items', count: fc.models_item },
    { key: 'recipes', label: 'Recipes', count: fc.recipes },
    { key: 'loot_tables', label: 'Loot', count: fc.loot_tables },
    { key: 'advancements', label: 'Advancements', count: fc.advancements },
    { key: 'biomes', label: 'Biomes', count: fc.biomes },
    { key: 'worldgen_features', label: 'Worldgen', count: fc.worldgen_features },
    { key: 'lang_files', label: 'Langs', count: fc.lang_files },
    { key: 'mixins', label: 'Mixins', count: fc.mixins },
  ];

  const fileLists: Array<{ key: keyof ImportedMod['feature_files']; label: string }> = [
    { key: 'blockstates', label: 'Blockstates' },
    { key: 'models_block', label: 'Block models' },
    { key: 'models_item', label: 'Item models' },
    { key: 'textures_block', label: 'Block textures' },
    { key: 'textures_item', label: 'Item textures' },
    { key: 'recipes', label: 'Recipes' },
    { key: 'loot_tables', label: 'Loot tables' },
    { key: 'advancements', label: 'Advancements' },
    { key: 'lang_files', label: 'Languages' },
    { key: 'other', label: 'Other data files' },
  ];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-bold text-slate-100">{mod.display_name}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {mod.mod_id} · v{mod.version || '—'} · {mod.loader}
            </div>
            {mod.description && (
              <div className="text-xs text-slate-300 mt-2 max-w-2xl">{mod.description}</div>
            )}
          </div>
          <div className="text-right text-[10px] text-slate-500 space-y-1">
            <div>{formatBytes(mod.raw_size_bytes)}</div>
            {mod.minecraft_version_range && (
              <div className="font-mono">MC {mod.minecraft_version_range}</div>
            )}
            {mod.homepage && (
              <a
                href={mod.homepage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:underline"
              >
                Homepage <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>

        {mod.authors.length > 0 && (
          <div className="text-[10px] text-slate-500 mt-3">
            <span className="font-semibold text-slate-400">Authors:</span> {mod.authors.join(', ')}
          </div>
        )}
        {mod.license && (
          <div className="text-[10px] text-slate-500">
            <span className="font-semibold text-slate-400">License:</span> {mod.license}
          </div>
        )}

        {mod.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {mod.warnings.map((w, i) => (
              <div key={i} className="text-[10px] text-amber-400 flex items-start gap-1.5">
                <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature counts grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {headlineCounts.map(({ key, label, count }) => {
          const Icon = KIND_ICON[key] ?? Box;
          return (
            <div
              key={key}
              className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-center"
            >
              <Icon size={12} className="text-slate-500 mx-auto mb-1" />
              <div className="text-base font-bold text-slate-100">{count}</div>
              <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
            </div>
          );
        })}
      </div>

      {/* Dependencies */}
      {mod.dependencies.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-xs font-bold text-slate-200 mb-2">
            Dependencies ({mod.dependencies.length})
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {mod.dependencies.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[10px] bg-slate-900/40 px-2 py-1 rounded"
              >
                <span className="font-mono text-slate-300">{d.mod_id}</span>
                <span className="text-slate-500">{d.version_range}</span>
                {d.mandatory ? (
                  <span className="ml-auto px-1 rounded bg-red-900/40 text-red-300">required</span>
                ) : (
                  <span className="ml-auto px-1 rounded bg-slate-700 text-slate-400">optional</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File lists */}
      {fileLists.map(({ key, label }) => {
        const files = (mod.feature_files[key] as string[]) ?? [];
        if (files.length === 0) return null;
        const matching = filter
          ? files.filter((f) => f.toLowerCase().includes(filter.toLowerCase()))
          : files;
        if (matching.length === 0) return null;
        const Icon = KIND_ICON[key] ?? FileCode;
        return (
          <div key={key} className="rounded-lg border border-slate-700 bg-slate-800/40">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
              <Icon size={12} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200">{label}</span>
              <span className="text-[10px] text-slate-500">
                {matching.length} of {files.length}
              </span>
            </div>
            <div className="divide-y divide-slate-700/40 max-h-72 overflow-y-auto">
              {matching.slice(0, 50).map((f) => (
                <div
                  key={f}
                  className="flex items-center px-3 py-1.5 text-[10px] font-mono text-slate-400 hover:bg-slate-800/80"
                >
                  <span className="truncate flex-1" title={f}>
                    {f}
                  </span>
                  <button
                    onClick={() => void onExtract(f)}
                    className="ml-2 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-200"
                    title="Extract this file"
                  >
                    <Download size={10} />
                  </button>
                </div>
              ))}
              {matching.length > 50 && (
                <div className="px-3 py-1.5 text-[10px] text-slate-500">
                  …{matching.length - 50} more (refine filter to narrow)
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Java packages */}
      {Object.keys(mod.java_packages).length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <div className="text-xs font-bold text-slate-200 mb-2">
            Java packages ({Object.keys(mod.java_packages).length} packages, {mod.total_classes}{' '}
            classes)
          </div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {Object.entries(mod.java_packages)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 100)
              .map(([pkg, count]) => (
                <div
                  key={pkg}
                  className="flex items-center gap-2 text-[10px] font-mono text-slate-400"
                >
                  <span className="truncate flex-1" title={pkg}>
                    {pkg}
                  </span>
                  <span className="text-slate-500">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Modpack view
// ============================================================================

const ModpackView: FC<{ pack: ImportedModpack }> = ({ pack }) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
      <div className="text-lg font-bold text-slate-100">{pack.name || 'Unnamed Modpack'}</div>
      <div className="text-xs text-slate-400 font-mono mt-0.5">
        {pack.format} · v{pack.version} · {pack.minecraft_version} · {pack.loader || 'unknown'}
      </div>
      {pack.author && (
        <div className="text-[10px] text-slate-500 mt-2">By {pack.author}</div>
      )}
      <div className="text-[10px] text-slate-500 mt-3">{pack.mod_count} mods bundled</div>
    </div>

    <div className="rounded-lg border border-slate-700 bg-slate-800/40">
      <div className="px-3 py-2 border-b border-slate-700 text-xs font-bold text-slate-200">
        Bundled mods
      </div>
      <div className="divide-y divide-slate-700/40 max-h-96 overflow-y-auto">
        {pack.mods.map((m, i) => (
          <div
            key={`${m.project_id}-${m.file_id}-${i}`}
            className="flex items-center gap-3 px-3 py-2 text-[11px]"
          >
            <Package size={11} className="text-slate-500" />
            <span className="font-mono text-slate-300 flex-1 truncate">
              {m.name || `${m.project_id}/${m.file_id}`}
            </span>
            <span className="text-[9px] text-slate-500">{m.source}</span>
            {!m.required && (
              <span className="text-[9px] px-1 rounded bg-slate-700 text-slate-400">optional</span>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);
