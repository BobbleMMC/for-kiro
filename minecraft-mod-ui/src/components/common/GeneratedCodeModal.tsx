/**
 * Modal that calls the Rust `generate_*_class` Tauri commands and shows
 * the produced Java source in a CodePreview pane.
 *
 * Used by the Block / Item editors. Keeping the modal self-contained means
 * each editor only needs to add a single button — the network call,
 * loading state, error handling, and code rendering all live here.
 */
import { useEffect, useState, type FC } from 'react';
import { Loader2, X, FileCode, AlertTriangle } from 'lucide-react';
import { CodePreview } from './CodePreview';
import {
  generateBlockClass,
  generateItemClass,
  isTauri,
  type GeneratedFile,
} from '../../lib/tauri-api';

interface Props {
  kind: 'block' | 'item';
  id: number;
  onClose: () => void;
}

export const GeneratedCodeModal: FC<Props> = ({ kind, id, onClose }) => {
  const [file, setFile] = useState<GeneratedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const result =
          kind === 'block' ? await generateBlockClass(id) : await generateItemClass(id);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-100">
              Generated Java {kind === 'block' ? 'Block' : 'Item'} Class
            </span>
            {file && (
              <span className="text-xs font-mono text-slate-500 ml-2">
                {file.package_path}/{file.file_name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

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
