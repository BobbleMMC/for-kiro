/**
 * Hot Reload Status Indicator
 * Shows real-time compilation state, file change notifications,
 * and auto-recompile progress in the header bar.
 */
import { useState, useEffect, type FC } from 'react';
import { Zap, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { listenToFsEvents, listenToBuildStatus, isTauri } from '../../lib/tauri-api';

type ReloadState = 'idle' | 'watching' | 'compiling' | 'success' | 'error';

interface FileChangeEvent {
  file_path: string;
  file_type: string;
  timestamp: number;
}

export const HotReloadStatus: FC = () => {
  const [state, setState] = useState<ReloadState>('watching');
  const [lastChange, setLastChange] = useState<FileChangeEvent | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const [autoReload, setAutoReload] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Listen to file system events from Tauri backend
  useEffect(() => {
    if (!isTauri()) {
      // Mock for development in browser
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
          // Auto-trigger recompile for code changes
          if (event.file_type === 'code' || event.file_type === 'config') {
            setState('compiling');
            // Simulate compile time (in real app, this triggers Gradle)
            setTimeout(() => setState('success'), 1500);
            setTimeout(() => setState('watching'), 3000);
          }
          // Instant swap for textures
          if (event.file_type === 'texture') {
            setState('success');
            setTimeout(() => setState('watching'), 1000);
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
            setTimeout(() => setState('watching'), 2000);
            break;
          case 'failed':
            setState('error');
            setErrorMessage('Build failed. Check console.');
            break;
        }
      });
    };

    setup();
    return () => {
      unlistenFs?.();
      unlistenBuild?.();
    };
  }, [autoReload]);

  // State display config
  const stateConfig: Record<ReloadState, { icon: typeof Zap; color: string; label: string; animate?: boolean }> = {
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
        <span className={`text-[10px] font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Change counter */}
      {changeCount > 0 && (
        <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {changeCount} changes
        </span>
      )}

      {/* Last changed file */}
      {lastChange && state === 'watching' && (
        <span className="text-[9px] text-slate-500 max-w-[120px] truncate" title={lastChange.file_path}>
          {lastChange.file_path.split('/').pop()}
        </span>
      )}

      {/* Error tooltip */}
      {state === 'error' && errorMessage && (
        <span className="text-[9px] text-red-400 max-w-[150px] truncate" title={errorMessage}>
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
