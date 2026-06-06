/**
 * Feature Catalog — single honest answer to "what can the studio actually
 * generate, and how much of it is real?"
 *
 * The catalog is fetched live from the Rust backend (`list_features`), so
 * adding a new `FeatureKind` on the Rust side is enough to make it appear
 * here — no duplicated lists in the frontend.
 *
 * Each row shows:
 *   - Status badge (Skeleton / Partial / Complete)
 *   - Four capability dots (template / validator / deps / version-aware)
 *   - Supported loaders and MC versions
 *   - A "Generate skeleton" action that calls the Rust skeleton emitter
 *     and surfaces the result in the same `GeneratedCodeModal` used by
 *     the Block / Item editors. Skeleton features are clearly labelled
 *     so there is no false promise of a full implementation.
 */
import { useEffect, useMemo, useState, type FC } from 'react';
import {
  Loader2,
  AlertTriangle,
  Search,
  RefreshCw,
  Wrench,
  Box,
  Package,
  Sword,
  Shield,
  Apple,
  Sparkles,
  Bug,
  Trees,
  Globe,
  Wand2,
  ScrollText,
  Award,
  Volume2,
  Image,
  Layers,
  Settings,
  Keyboard,
  Layout,
  Terminal,
  GitBranch,
  Cpu,
  Code,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';
import {
  isTauri,
  listFeatures,
  generateFeatureSkeleton,
  writeGeneratedFile,
  type FeatureInfo,
  type FeatureKindSlug,
  type GeneratedFile,
} from '../../lib/tauri-api';
import { useProjectStore } from '../../stores/projectStore';
import { CodePreview } from '../common/CodePreview';

const ICONS: Record<FeatureKindSlug, LucideIcon> = {
  block: Box,
  item: Package,
  tool: Wrench,
  armor: Shield,
  food: Apple,
  enchantment: Sparkles,
  entity: Bug,
  geckolib_animation: Bug,
  biome: Trees,
  dimension: Globe,
  worldgen_feature: Wand2,
  recipe: ScrollText,
  loot_table: ScrollText,
  advancement: Award,
  sound: Volume2,
  texture: Image,
  model: Layers,
  config: Settings,
  keybind: Keyboard,
  screen: Layout,
  command: Terminal,
  event_handler: GitBranch,
  mixin: Cpu,
  jei_integration: Code,
  dependency_integration: Puzzle,
};

const STATUS_STYLE: Record<
  FeatureInfo['status'],
  { label: string; className: string }
> = {
  skeleton: {
    label: 'Skeleton',
    className: 'bg-slate-700 text-slate-300 border-slate-600',
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  },
  complete: {
    label: 'Complete',
    className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  },
};

const STATUS_ORDER: Record<FeatureInfo['status'], number> = {
  complete: 0,
  partial: 1,
  skeleton: 2,
};

interface PreviewState {
  file: GeneratedFile;
  feature: FeatureInfo;
  writing: boolean;
  writtenAt: string | null;
  writeError: string | null;
}

export const FeatureCatalog: FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);

  const [features, setFeatures] = useState<FeatureInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeatureInfo['status'] | 'all'>('all');
  const [generating, setGenerating] = useState<FeatureKindSlug | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    if (!isTauri()) {
      setError('Feature catalog requires the desktop app.');
      setLoading(false);
      return;
    }
    try {
      const list = await listFeatures();
      setFeatures(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  const grouped = useMemo(() => {
    if (!features) return [] as Array<{ category: string; rows: FeatureInfo[] }>;
    const filtered = features.filter((f) => {
      const matchesText =
        !filter.trim() ||
        f.name.toLowerCase().includes(filter.toLowerCase()) ||
        f.description.toLowerCase().includes(filter.toLowerCase());
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      return matchesText && matchesStatus;
    });
    const map = new Map<string, FeatureInfo[]>();
    for (const f of filtered) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries()).map(([category, rows]) => ({
      category,
      rows: rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    }));
  }, [features, filter, statusFilter]);

  const counts = useMemo(() => {
    if (!features) return { complete: 0, partial: 0, skeleton: 0, total: 0 };
    return features.reduce(
      (acc, f) => {
        acc[f.status] += 1;
        acc.total += 1;
        return acc;
      },
      { complete: 0, partial: 0, skeleton: 0, total: 0 }
    );
  }, [features]);

  const handleGenerate = async (feature: FeatureInfo) => {
    if (!currentProject) {
      addConsoleMessage({
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        level: 'warning',
        message: 'Open a project before generating skeleton files.',
        source: 'FeatureCatalog',
      });
      return;
    }
    setGenerating(feature.kind);
    try {
      const file = await generateFeatureSkeleton({
        project_id: currentProject.id,
        kind: feature.kind,
        name: feature.name.replace(/[^A-Za-z0-9]/g, ''),
      });
      setPreview({ file, feature, writing: false, writtenAt: null, writeError: null });
    } catch (e) {
      addConsoleMessage({
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        level: 'error',
        message: `Skeleton generation failed: ${e}`,
        source: 'FeatureCatalog',
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleWrite = async () => {
    if (!preview || !currentProject) return;
    setPreview({ ...preview, writing: true, writeError: null });
    try {
      const result = await writeGeneratedFile({
        project_id: currentProject.id,
        package_path: preview.file.package_path,
        file_name: preview.file.file_name,
        source: preview.file.source,
      });
      setPreview({
        ...preview,
        writing: false,
        writtenAt: result.relative_path,
      });
      addConsoleMessage({
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        level: 'success',
        message: `Skeleton written to ${result.relative_path}`,
        source: 'FeatureCatalog',
      });
    } catch (e) {
      setPreview({
        ...preview,
        writing: false,
        writeError: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <span className="text-sm font-bold text-slate-100">Feature Catalog</span>
        {features && (
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300">
              {counts.complete} complete
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300">
              {counts.partial} partial
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {counts.skeleton} skeleton
            </span>
            <span className="text-slate-500">/ {counts.total} total</span>
          </div>
        )}
        <div className="flex-1" />
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or description…"
            className="pl-7 pr-3 py-1 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded text-xs text-slate-200 placeholder-slate-500 outline-none w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as FeatureInfo['status'] | 'all')
          }
          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
        >
          <option value="all">All statuses</option>
          <option value="complete">Complete</option>
          <option value="partial">Partial</option>
          <option value="skeleton">Skeleton</option>
        </select>
        <button
          onClick={() => void loadCatalog()}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title="Reload"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading feature catalog…</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/40 bg-red-950/30 text-red-200 text-sm">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">Could not load catalog</div>
              <div className="text-xs text-red-300/80">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && features && (
          <div className="space-y-6">
            {grouped.map(({ category, rows }) => (
              <div key={category}>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                  {category} <span className="text-slate-600">· {rows.length}</span>
                </h3>
                <div className="rounded-lg border border-slate-700 overflow-hidden divide-y divide-slate-700">
                  {rows.map((f) => {
                    const Icon = ICONS[f.kind] ?? Box;
                    return (
                      <FeatureRow
                        key={f.kind}
                        Icon={Icon}
                        feature={f}
                        generating={generating === f.kind}
                        onGenerate={() => void handleGenerate(f)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          state={preview}
          onClose={() => setPreview(null)}
          onWrite={() => void handleWrite()}
        />
      )}
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface RowProps {
  Icon: LucideIcon;
  feature: FeatureInfo;
  generating: boolean;
  onGenerate: () => void;
}

const FeatureRow: FC<RowProps> = ({ Icon, feature, generating, onGenerate }) => {
  const status = STATUS_STYLE[feature.status];
  const Dot = ({ on, label }: { on: boolean; label: string }) => (
    <span
      title={label}
      className={`inline-block w-2 h-2 rounded-full ${
        on ? 'bg-emerald-400' : 'bg-slate-600'
      }`}
    />
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/40 hover:bg-slate-800/80 transition-colors">
      <div className="w-7 h-7 rounded-md bg-slate-700/60 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className="text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-100 truncate">{feature.name}</span>
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 truncate" title={feature.description}>
          {feature.description}
        </div>
      </div>

      {/* Capability matrix */}
      <div
        className="flex items-center gap-1.5 mx-3"
        title="template · validator · deps · version-aware"
      >
        <Dot on={feature.has_template} label="Template" />
        <Dot on={feature.has_validator} label="Validator" />
        <Dot on={feature.has_dependency_resolver} label="Dependency resolver" />
        <Dot on={feature.has_version_aware_generator} label="Version-aware generator" />
      </div>

      {/* Loaders */}
      <div className="hidden md:flex items-center gap-1 mx-2 text-[9px] text-slate-500">
        {feature.supported_loaders.map((l) => (
          <span
            key={l}
            className="px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono"
          >
            {l}
          </span>
        ))}
      </div>

      <button
        onClick={onGenerate}
        disabled={generating}
        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-medium rounded transition-colors flex items-center gap-1.5"
        title={
          feature.status === 'complete'
            ? 'Generate via the dedicated editor; this button emits a fresh skeleton.'
            : 'Emit a TODO-flavoured skeleton you can flesh out by hand.'
        }
      >
        {generating ? <Loader2 size={11} className="animate-spin" /> : null}
        {feature.status === 'complete' ? 'Generate skeleton' : 'Generate'}
      </button>
    </div>
  );
};

interface PreviewProps {
  state: PreviewState;
  onClose: () => void;
  onWrite: () => void;
}

const PreviewModal: FC<PreviewProps> = ({ state, onClose, onWrite }) => {
  const { file, feature, writing, writtenAt, writeError } = state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Code size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-100">
              {feature.name} skeleton
            </span>
            <span className="text-xs font-mono text-slate-500 ml-2">
              {file.package_path}/{file.file_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onWrite}
              disabled={writing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded"
            >
              {writing ? <Loader2 size={12} className="animate-spin" /> : null}
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

        {writtenAt && !writeError && (
          <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-700/40 text-emerald-200 text-xs">
            Written to <span className="font-mono">{writtenAt}</span>
          </div>
        )}
        {writeError && (
          <div className="px-5 py-2 bg-red-950/40 border-b border-red-700/40 text-red-200 text-xs">
            {writeError}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <CodePreview
            code={file.source}
            language={file.file_name.endsWith('.json') ? 'json' : 'java'}
            title={file.file_name}
            fileName={file.file_name}
          />
        </div>
      </div>
    </div>
  );
};
