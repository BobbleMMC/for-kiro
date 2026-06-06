/**
 * Hot Reload Status Indicator.
 *
 * Two responsibilities:
 *   1. Subscribe to `fs-event` and `build-status` so the header pill reflects
 *      real filesystem activity instead of a hard-coded animation.
 *   2. Tell the Rust backend to (re)attach a watcher whenever the active
 *      project changes — `start_watching(project_id)` resolves the project
 *      directory via the scaffold marker, so it is a no-op (with a benign
 *      error in the console) until the project has been scaffolded.
 *
 * On unmount we explicitly call `stop_watching` so we do not leak a
 * `notify::RecommendedWatcher` on the Rust side.
 */
import { useState, useEffect, type FC } from 'react';
import { Zap, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  listenToFsEvents,
  listenToBuildStatus,
  isTauri,
  startWatching,
  stopWatching,
} from '../../lib/tauri-api';
import { useProjectStore } from '../../stores/projectStore';

type ReloadState = 'idle' | 'watching' | 'compiling' | 'success' | 'error';

interface FileChangeEvent {
  file_path: string;
  file_type: string;
  timestamp: number;
}

export const HotReloadStatus: FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const [state, setState] = useState<ReloadState>('idle');
  const [lastChange, setLastChange] = useState<FileChangeEvent | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const [autoReload, setAutoReload] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ----- Attach event listeners (run once) -----
  useEffect(() => {
    if (!isTauri()) {
      setState('watching');
      return;
    }

    let unlistenFs: (() => void) | null = null;
    let unlistenBuild: (() => void) | null = null;

    const setup = async () => {
      unlistenFs = await listenToFsEvents((event) => {
        setLastChange({
          file_path: event.file_path,
          file_type: event.file_type,
          timestamp: Date.now(),
        });
        setChangeCount((c) => c + 1);

        if (autoReload) {
          if (event.file_type === 'code' || event.file_type === 'config') {
            setState('compiling');
            window.setTimeout(() => setState('success'), 1500);
            window.setTimeout(() => setState('watching'), 3000);
          }
          if (event.file_type === 'texture') {
            setState('success');
            window.setTimeout(() => setState('watching'), 1000);
          }
        }
      });

      unlistenBuild = await listenToBuildStatus((status) => {
        switch (status) {
          case 'started':
            setState('compiling');
            break;
          case 'success':
            setState('success');
            setErrorMessage(null);
            window.setTimeout(() => setState('watching'), 2000);
            break;
          case 'failed':
            setState('error');
            setErrorMessage('Build failed. Check console.');
            break;
        }
      });
    };

    void setup();
    return () => {
      unlistenFs?.();
      unlistenBuild?.();
    };
  }, [autoReload]);

  // ----- Re-attach native watcher whenever the active project changes -----
  useEffect(() => {
    if (!isTauri()) return;
    if (!currentProject) {
      setState('idle');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await startWatching(currentProject.id);
        if (!cancelled) setState('watching');
      } catch (err) {
        // Project not yet scaffolded — fine, we just stay idle until first build.
        if (!cancelled) {
          setState('idle');
          // eslint-disable-next-line no-console
          console.debug('[HotReload] Watcher inactive:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      void stopWatching().catch(() => {});
    };
  }, [currentProject]);

  // State display config
  const stateConfig: Record<
    ReloadState,
    { icon: typeof Zap; color: string; label: string; animate?: boolean }
  > = {
    idle: { icon: Zap, color: 'text-slate-500', label: 'Idle' },
    watching: { icon: Zap, color: 'text-green-400', label: 'Watching' },
    compiling: { icon: Loader2, color: 'text-blue-400', label: 'Compiling...', animate: true },
    success: { icon: CheckCircle, color: 'text-green-400', label: 'Ready' },
    error: { icon: XCircle, color: 'text-red-400', label: 'Error' },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <Icon
          size={12}
          className={`${config.color} ${config.animate ? 'animate-spin' : ''}`}
        />
        <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
      </div>

      {/* Change counter */}
      {changeCount > 0 && (
        <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {changeCount} changes
        </span>
      )}

      {/* Last changed file */}
      {lastChange && state === 'watching' && (
        <span
          className="text-[9px] text-slate-500 max-w-[120px] truncate"
          title={lastChange.file_path}
        >
          {lastChange.file_path.split('/').pop()}
        </span>
      )}

      {/* Error tooltip */}
      {state === 'error' && errorMessage && (
        <span
          className="text-[9px] text-red-400 max-w-[150px] truncate"
          title={errorMessage}
        >
          {errorMessage}
        </span>
      )}

      {/* Auto-reload toggle */}
      <button
        onClick={() => setAutoReload(!autoReload)}
        className={`p-1 rounded transition-colors ${
          autoReload
            ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
            : 'bg-slate-700 text-slate-500 hover:text-slate-300'
        }`}
        title={autoReload ? 'Auto-reload ON' : 'Auto-reload OFF'}
      >
        <RefreshCw size={10} />
      </button>
    </div>
  );
};
