import { useState, type FC, useRef, useEffect, useMemo } from 'react';
import { Trash2, Copy, ChevronDown, ChevronUp, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { BuildLog } from '../../services/buildPipeline';

interface EnhancedConsoleProps {
  logs: BuildLog[];
  onClear?: () => void;
  maxLogs?: number;
  showFilters?: boolean;
  autoScroll?: boolean;
}

interface FilterState {
  info: boolean;
  warning: boolean;
  error: boolean;
  success: boolean;
  debug: boolean;
}

interface ExpandedLogs {
  [key: string]: boolean;
}

/**
 * Parse error location from message
 * Handles patterns like:
 * - file.ts:123:45
 * - [path/to/file.java:42]
 */
const parseErrorLocation = (message: string): { file?: string; line?: number; column?: number } | null => {
  const patterns = [
    /(\S+\.(?:ts|tsx|js|jsx|java))[:\s]+(\d+)(?:[:@](\d+))?/i,
    /\[([^\]]+):(\d+)\]/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: match[3] ? parseInt(match[3]) : undefined,
      };
    }
  }
  return null;
};

/**
 * Extract stack trace from multi-line messages
 */
const extractStackTrace = (message: string): string[] => {
  const lines = message.split('\n');
  const stackTraceStart = lines.findIndex(l => l.trim().startsWith('at '));

  if (stackTraceStart >= 0) {
    return lines.slice(stackTraceStart);
  }
  return [];
};

/**
 * Get icon for log level
 */
const getLevelIcon = (level: string) => {
  switch (level) {
    case 'error':
      return <AlertCircle size={16} className="flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle size={16} className="flex-shrink-0" />;
    case 'success':
      return <CheckCircle size={16} className="flex-shrink-0" />;
    default:
      return <Info size={16} className="flex-shrink-0" />;
  }
};

/**
 * Get colors for log level
 */
const getLevelColors = (level: string) => {
  switch (level) {
    case 'error':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
        icon: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-300',
        icon: 'text-yellow-600 dark:text-yellow-400',
        badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
      };
    case 'success':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-600 dark:text-green-400',
        badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/30',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-700 dark:text-slate-300',
        icon: 'text-slate-600 dark:text-slate-400',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      };
  }
};

/**
 * Enhanced Console Component
 * Displays build logs with error highlighting, stack traces, and filtering
 */
export const EnhancedConsole: FC<EnhancedConsoleProps> = ({
  logs,
  onClear,
  maxLogs = 1000,
  showFilters = true,
  autoScroll = true,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    info: true,
    warning: true,
    error: true,
    success: true,
    debug: true,
  });

  const [expandedLogs, setExpandedLogs] = useState<ExpandedLogs>({});
  const [searchTerm, setSearchTerm] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => filters[log.level as keyof FilterState] !== false)
      .filter(log => {
        if (!searchTerm) return true;
        return (
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.source?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .slice(-maxLogs);
  }, [logs, filters, searchTerm, maxLogs]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: logs.length,
      errors: logs.filter(l => l.level === 'error').length,
      warnings: logs.filter(l => l.level === 'warning').length,
      success: logs.filter(l => l.level === 'success').length,
    };
  }, [logs]);

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const handleCopyLog = (message: string) => {
    navigator.clipboard.writeText(message);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Build Console</h3>
          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{stats.total} messages</span>
            {stats.errors > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{stats.errors} errors</span>}
            {stats.warnings > 0 && <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{stats.warnings} warnings</span>}
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Clear console"
        >
          <Trash2 size={16} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex-shrink-0 space-y-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
          />

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilters(prev => ({ ...prev, info: !prev.info }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.info
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, debug: !prev.debug }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.debug
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              Debug
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, success: !prev.success }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.success
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              Success
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, warning: !prev.warning }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.warning
                  ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              Warnings
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, error: !prev.error }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.error
                  ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              Errors
            </button>
          </div>
        </div>
      )}

      {/* Console Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <p>{logs.length === 0 ? 'No console output yet...' : 'No matching logs'}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredLogs.map(log => {
              const colors = getLevelColors(log.level);
              const errorLocation = parseErrorLocation(log.message);
              const stackTrace = extractStackTrace(log.message);
              const isExpanded = expandedLogs[log.id];

              return (
                <div
                  key={log.id}
                  className={`border-b border-slate-200 dark:border-slate-700 p-2 transition-colors ${colors.bg}`}
                >
                  {/* Main Log Line */}
                  <div className="flex gap-2 items-start group">
                    <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                      {getLevelIcon(log.level)}
                    </div>

                    {/* Timestamp */}
                    <span className="text-slate-500 dark:text-slate-500 flex-shrink-0 min-w-max">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    {/* Level Badge */}
                    <span className={`${colors.badge} px-1.5 py-0.5 rounded font-semibold flex-shrink-0`}>
                      {log.level.toUpperCase()}
                    </span>

                    {/* Source */}
                    {log.source && (
                      <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">
                        [{log.source}]
                      </span>
                    )}

                    {/* Main Message */}
                    <div className="flex-1 min-w-0 break-words">
                      <p className={colors.text}>{log.message}</p>

                      {/* Error Location */}
                      {errorLocation && (
                        <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 ml-2">
                          📍 {errorLocation.file}
                          {errorLocation.line && `:${errorLocation.line}`}
                          {errorLocation.column && `:${errorLocation.column}`}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {stackTrace.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(log.id)}
                          className={`p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 ${colors.icon}`}
                          title="Toggle stack trace"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyLog(log.message)}
                        className={`p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 ${colors.icon}`}
                        title="Copy message"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Stack Trace (Expanded) */}
                  {isExpanded && stackTrace.length > 0 && (
                    <div className="mt-2 ml-6 pl-2 border-l-2 border-slate-400 dark:border-slate-600 space-y-1">
                      {stackTrace.map((line, i) => (
                        <div key={i} className={`text-slate-600 dark:text-slate-400 text-xs font-mono`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        {filteredLogs.length > 0 && (
          <span>
            Showing {filteredLogs.length} of {stats.total} messages
            {searchTerm && ` (filtered by "${searchTerm}")`}
          </span>
        )}
      </div>
    </div>
  );
};

export default EnhancedConsole;
