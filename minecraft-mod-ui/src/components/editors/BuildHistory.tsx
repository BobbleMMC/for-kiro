import { useState, useMemo, type FC } from 'react';
import { Trash2, Download, RotateCcw, Filter, Calendar, Clock, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import type { BuildResult } from '../../services/buildPipeline';

interface BuildHistoryProps {
  builds: BuildResult[];
  onRebuild?: (buildId: string) => void;
  onDelete?: (buildId: string) => void;
  onClear?: () => void;
}

type SortBy = 'date' | 'duration' | 'status';
type FilterStatus = 'all' | 'success' | 'failed' | 'cancelled';

interface HistoryStats {
  total: number;
  successful: number;
  failed: number;
  cancelled: number;
  successRate: number;
  averageDuration: number;
  totalDuration: number;
}

/**
 * Calculate build history statistics
 */
const calculateStats = (builds: BuildResult[]): HistoryStats => {
  const total = builds.length;
  const successful = builds.filter(b => b.status === 'success').length;
  const failed = builds.filter(b => b.status === 'failed').length;
  const cancelled = builds.filter(b => b.status === 'cancelled').length;
  const totalDuration = builds.reduce((sum, b) => sum + b.duration, 0);

  return {
    total,
    successful,
    failed,
    cancelled,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    averageDuration: total > 0 ? totalDuration / total : 0,
    totalDuration,
  };
};

/**
 * Format milliseconds to readable duration
 */
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Format timestamp to readable date
 */
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Get status badge colors
 */
const getStatusColors = (status: string) => {
  switch (status) {
    case 'success':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
        icon: 'text-green-600 dark:text-green-400',
      };
    case 'failed':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
        icon: 'text-red-600 dark:text-red-400',
      };
    case 'cancelled':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
        icon: 'text-yellow-600 dark:text-yellow-400',
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900/20',
        border: 'border-slate-200 dark:border-slate-700',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
        icon: 'text-slate-600 dark:text-slate-400',
      };
  }
};

/**
 * BuildHistory Component
 * Displays build history with filtering, sorting, and quick rebuild
 */
export const BuildHistory: FC<BuildHistoryProps> = ({ builds, onRebuild, onDelete, onClear }) => {
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null);

  const stats = useMemo(() => calculateStats(builds), [builds]);

  const filteredAndSortedBuilds = useMemo(() => {
    let filtered = builds;

    // Apply filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    // Apply sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => b.startTime - a.startTime);
        break;
      case 'duration':
        sorted.sort((a, b) => b.duration - a.duration);
        break;
      case 'status':
        sorted.sort((a, b) => {
          const statusOrder = { success: 0, failed: 1, cancelled: 2, idle: 3 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3);
        });
        break;
    }

    return sorted;
  }, [builds, sortBy, filterStatus]);

  const toggleExpanded = (buildId: string) => {
    setExpandedBuildId(expandedBuildId === buildId ? null : buildId);
  };

  if (builds.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar size={40} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">No builds yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">Run your first build to see history</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Build Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Builds</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Successful</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Failed</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{stats.successRate.toFixed(0)}%</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Success Rate</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{formatDuration(stats.averageDuration)}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg Duration</p>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-2 items-center">
              <Filter size={16} className="text-gray-600 dark:text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="success">Successful</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <Zap size={16} className="text-gray-600 dark:text-gray-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="date">Recent First</option>
                <option value="duration">Slowest First</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {builds.length > 0 && (
            <Button onClick={onClear} size="sm" variant="outline" className="text-red-600 dark:text-red-400">
              <Trash2 size={14} className="mr-1" />
              Clear History
            </Button>
          )}
        </div>
      </Card>

      {/* Build List */}
      <div className="space-y-3">
        {filteredAndSortedBuilds.map(build => {
          const colors = getStatusColors(build.status);
          const isExpanded = expandedBuildId === build.buildId;

          return (
            <div
              key={build.buildId}
              className={`border-2 rounded-lg overflow-hidden transition-colors ${colors.border} ${colors.bg}`}
            >
              {/* Build Summary */}
              <button
                onClick={() => toggleExpanded(build.buildId)}
                className="w-full text-left p-4 hover:opacity-75 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {build.status === 'success' ? (
                      <CheckCircle2 size={20} className={colors.icon} />
                    ) : build.status === 'failed' ? (
                      <AlertCircle size={20} className={colors.icon} />
                    ) : (
                      <Clock size={20} className={colors.icon} />
                    )}
                  </div>

                  {/* Build Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${colors.badge} px-2 py-0.5 rounded text-xs font-semibold`}>
                        {build.status.toUpperCase()}
                      </span>
                      {build.errorSummary && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {build.errorSummary.errorCount > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              {build.errorSummary.errorCount} errors
                            </span>
                          )}
                          {build.errorSummary.warningCount > 0 && (
                            <>
                              {build.errorSummary.errorCount > 0 && ', '}
                              <span className="text-yellow-600 dark:text-yellow-400">
                                {build.errorSummary.warningCount} warnings
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(build.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(build.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        📦 {build.artifacts.length} artifact{build.artifacts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    {build.status === 'success' && build.artifacts.length > 0 && (
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          const artifact = build.artifacts[0];
                          const link = document.createElement('a');
                          link.href = `#${artifact.path}`;
                          link.download = artifact.name;
                          link.click();
                        }}
                        size="sm"
                        variant="outline"
                        title="Download artifact"
                      >
                        <Download size={14} />
                      </Button>
                    )}
                    {onRebuild && (
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          onRebuild(build.buildId);
                        }}
                        size="sm"
                        variant="outline"
                        title="Rebuild"
                      >
                        <RotateCcw size={14} />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(build.buildId);
                        }}
                        size="sm"
                        variant="outline"
                        className="text-red-600 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </button>

              {/* Build Details (Expanded) */}
              {isExpanded && (
                <div className="border-t border-gray-300 dark:border-gray-600 p-4 bg-white/50 dark:bg-gray-900/30 space-y-3">
                  {/* Tasks Summary */}
                  {build.tasks.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Tasks ({build.tasks.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {build.tasks.map(task => (
                          <div
                            key={task.id}
                            className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700"
                          >
                            <div className="font-mono text-gray-700 dark:text-gray-300 truncate">{task.name}</div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {task.status === 'success' ? '✓' : '○'} {formatDuration(task.duration)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Artifacts */}
                  {build.artifacts.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Artifacts</p>
                      <div className="space-y-1">
                        {build.artifacts.map(artifact => (
                          <div key={artifact.id} className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between">
                            <div>
                              <div className="font-mono text-gray-700 dark:text-gray-300">{artifact.name}</div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {Math.round(artifact.size / 1024)} KB
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `#${artifact.path}`;
                                link.download = artifact.name;
                                link.click();
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <Download size={12} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Summary */}
                  {build.errorSummary && (build.errorSummary.errorCount > 0 || build.errorSummary.warningCount > 0) && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Summary</p>
                      <div className="space-y-1 text-xs">
                        {build.errorSummary.errorCount > 0 && (
                          <p className="text-red-600 dark:text-red-400">
                            <strong>{build.errorSummary.errorCount}</strong> error{build.errorSummary.errorCount !== 1 ? 's' : ''}
                          </p>
                        )}
                        {build.errorSummary.warningCount > 0 && (
                          <p className="text-yellow-600 dark:text-yellow-400">
                            <strong>{build.errorSummary.warningCount}</strong> warning{build.errorSummary.warningCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty Filter Result */}
      {filteredAndSortedBuilds.length === 0 && (
        <Card className="p-8 text-center text-gray-600 dark:text-gray-400">
          <Filter size={32} className="mx-auto mb-2 opacity-50" />
          <p>No builds match the current filter</p>
        </Card>
      )}
    </div>
  );
};

export default BuildHistory;
