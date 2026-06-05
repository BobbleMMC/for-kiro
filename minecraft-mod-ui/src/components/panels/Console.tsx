import { FC, useRef, useEffect, useState } from 'react';
import { Trash2, Copy } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '14:32:10', level: 'info', message: '🔄 Project loaded: "My First Mod"' },
  { id: '2', timestamp: '14:32:11', level: 'info', message: '📁 Assets scanned: 24 files found' },
  { id: '3', timestamp: '14:32:12', level: 'success', message: '✅ All validations passed' },
  { id: '4', timestamp: '14:32:13', level: 'info', message: '🔍 Watching for changes...' },
  { id: '5', timestamp: '14:32:15', level: 'info', message: '⚙️ Gradle initialized' },
  { id: '6', timestamp: '14:32:16', level: 'warn', message: '⚠️ Warning: Unused import in BlockRegistry' },
  { id: '7', timestamp: '14:32:17', level: 'info', message: '🤖 AI Scanner ready for code analysis' },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case 'error':
      return 'text-red-400 bg-red-500/5';
    case 'warn':
      return 'text-yellow-400 bg-yellow-500/5';
    case 'success':
      return 'text-green-400 bg-green-500/5';
    case 'info':
    default:
      return 'text-blue-400 bg-blue-500/5';
  }
};

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'error':
      return '❌';
    case 'warn':
      return '⚠️';
    case 'success':
      return '✅';
    case 'info':
    default:
      return 'ℹ️';
  }
};

export const Console: FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter((log) => log.level === filter);

  const handleClear = () => {
    setLogs([]);
  };

  const handleCopyAll = () => {
    const text = logs.map((log) => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Filter:</span>
          {(['all', 'info', 'warn', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <span className="text-xs text-slate-500 ml-4">
            {filteredLogs.length} / {logs.length} messages
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Copy all logs"
          >
            <Copy size={14} className="text-slate-400" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Clear console"
          >
            <Trash2 size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 p-3">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p className="text-xs">No logs to display</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2 px-2 py-1 rounded text-xs font-mono ${getLevelColor(log.level)}`}
            >
              <span className="text-slate-500 flex-shrink-0 min-w-16">[{log.timestamp}]</span>
              <span className="flex-shrink-0">{getLevelIcon(log.level)}</span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
        <span>🟢 Ready</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
