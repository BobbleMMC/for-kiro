/**
 * Modal that calls the Rust `generate_*` Tauri commands and shows the
 * produced Java source in a CodePreview pane. From the modal the user can:
 *   1. Copy the source to the clipboard or download it as a `.java` file
 *      (handled by the underlying CodePreview).
 *   2. **Write it directly into the project's scaffolded source tree** —
 *      this is what makes the codegen pipeline closed-loop. The button
 *      calls `write_generated_file` which resolves the project's on-disk
 *      path via the scaffold marker and writes
 *      `src/main/java/<package_path>/<file_name>`. The on-disk watcher
 *      then emits an `fs-event` and the next build picks it up.
 */
import { useEffect, useState, type FC } from 'react';
import {
  Loader2,
  X,
  FileCode,
  AlertTriangle,
  CheckCircle,
  HardDrive,
} from 'lucide-react';
import { CodePreview } from './CodePreview';
import {
  generateBlockClass,
  generateItemClass,
  generateEventHandlers,
  writeGeneratedFile,
  isTauri,
  type GeneratedFile,
} from '../../lib/tauri-api';
import { useProjectStore } from '../../stores/projectStore';

type Kind = 'block' | 'item' | 'graph';

interface Props {
  kind: Kind;
  id: number;
  onClose: () => void;
}

const titleFor = (kind: Kind): string => {
  switch (kind) {
    case 'block':
      return 'Generated Java Block Class';
    case 'item':
      return 'Generated Java Item Class';
    case 'graph':
      return 'Generated Event Handlers';
  }
};

async function generate(kind: Kind, id: number): Promise<GeneratedFile> {
  switch (kind) {
    case 'block':
      return generateBlockClass(id);
    case 'item':
      return generateItemClass(id);
    case 'graph':
      return generateEventHandlers(id);
  }
}

export const GeneratedCodeModal: FC<Props> = ({ kind, id, onClose }) => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);

  const [file, setFile] = useState<GeneratedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [writtenAt, setWrittenAt] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTauri()) {
        setError(
          'Code generation requires the desktop app — the browser dev server has no Rust backend.'
        );
        setLoading(false);
        return;
      }
      try {
        const result = await generate(kind, id);
        if (!cancelled) {
          setFile(result);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  const handleWriteToDisk = async () => {
    if (!file || !currentProject) return;
    setWriting(true);
    setWriteError(null);
    try {
      const result = await writeGeneratedFile({
        project_id: currentProject.id,
        package_path: file.package_path,
        file_name: file.file_name,
        source: file.source,
      });
      setWrittenAt(result.relative_path);
      addConsoleMessage({
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        level: 'success',
        message: `Wrote ${result.relative_path}`,
        source: 'CodeGen',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setWriteError(msg);
      addConsoleMessage({
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        level: 'error',
        message: `Write failed: ${msg}`,
        source: 'CodeGen',
      });
    } finally {
      setWriting(false);
    }
  };

  const canWrite = isTauri() && file && currentProject && !loading && !error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-100">{titleFor(kind)}</span>
            {file && (
              <span className="text-xs font-mono text-slate-500 ml-2">
                {file.package_path}/{file.file_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (
              <button
                onClick={handleWriteToDisk}
                disabled={writing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                title="Write this file into the scaffolded project on disk"
              >
                {writing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <HardDrive size={12} />
                )}
                Write to project
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status bar — write feedback */}
        {writtenAt && !writeError && (
          <div className="flex items-center gap-2 px-5 py-2 bg-emerald-950/40 border-b border-emerald-700/40 text-emerald-200 text-xs">
            <CheckCircle size={13} />
            <span>
              Written to <span className="font-mono">{writtenAt}</span>
            </span>
          </div>
        )}
        {writeError && (
          <div className="flex items-start gap-2 px-5 py-2 bg-red-950/40 border-b border-red-700/40 text-red-200 text-xs">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
            <span>{writeError}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Generating Java source…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/40 bg-red-950/30 text-red-200 text-sm">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1">Could not generate code</div>
                <div className="text-xs text-red-300/80">{error}</div>
              </div>
            </div>
          )}

          {file && !loading && !error && (
            <CodePreview
              code={file.source}
              language="java"
              title={file.file_name}
              fileName={file.file_name}
            />
          )}
        </div>
      </div>
    </div>
  );
};
