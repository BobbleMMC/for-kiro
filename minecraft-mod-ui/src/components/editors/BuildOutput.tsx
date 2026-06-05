import { useState, type FC, useRef } from 'react';
import { Play, Square, Download, AlertCircle, CheckCircle2, Loader, Package } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { EnhancedConsole } from '../common/EnhancedConsole';
import type { BuildResult, BuildTask, BuildLog, BuildConfig } from '../../services/buildPipeline';
import { BuildPipeline, BuildHistoryManager } from '../../services/buildPipeline';

interface BuildOutputProps {
  config?: BuildConfig;
  onBuildComplete?: (result: BuildResult) => void;
}

/**
 * BuildOutput Component
 * Displays real-time build progress, tasks, logs, and artifacts
 */
export const BuildOutput: FC<BuildOutputProps> = ({ config, onBuildComplete }) => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [tasks, setTasks] = useState<BuildTask[]>([]);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [progress, setProgress] = useState(0);
  const pipelineRef = useRef<BuildPipeline | null>(null);
  const historyRef = useRef(new BuildHistoryManager());

  const handleStartBuild = async () => {
    if (!config) {
      alert('No build configuration available');
      return;
    }

    setIsBuilding(true);
    setProgress(0);
    setTasks([]);
    setLogs([]);
    setBuildResult(null);

    // Create new pipeline
    pipelineRef.current = new BuildPipeline();

    try {
      const result = await pipelineRef.current.execute(config, {
        onLog: (log) => {
          setLogs(prev => [...prev, log]);
        },
        onTaskUpdate: (task) => {
          setTasks(prev => {
            const existing = prev.find(t => t.id === task.id);
            if (existing) {
              return prev.map(t => (t.id === task.id ? task : t));
            }
            return [...prev, task];
          });
        },
        onProgress: (percentage) => {
          setProgress(percentage);
        },
      });

      setBuildResult(result);
      historyRef.current.addBuild(result);
      onBuildComplete?.(result);
    } catch (error) {
      console.error('Build failed:', error);
    } finally {
      setIsBuilding(false);
      setProgress(100);
    }
  };

  const handleCancelBuild = () => {
    if (pipelineRef.current) {
      pipelineRef.current.cancel();
      setIsBuilding(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDownloadArtifact = (artifactPath: string, artifactName: string) => {
    // In a real app, this would download from the server
    const link = document.createElement('a');
    link.href = `#${artifactPath}`;
    link.download = artifactName;
    link.click();
  };

  const successfulTasks = tasks.filter(t => t.status === 'success').length;
  const totalDuration = buildResult?.duration || 0;

  return (
    <div className="space-y-6">
      {/* Build Control Panel */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package size={20} />
              Build Control
            </h3>
            {config && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {config.modName} v{config.modVersion} ({config.loaderType.toUpperCase()})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleStartBuild}
              disabled={isBuilding || !config}
              variant={buildResult?.success ? 'primary' : 'primary'}
              className="flex items-center gap-2"
            >
              <Play size={16} />
              {isBuilding ? 'Building...' : buildResult?.success ? 'Rebuild' : 'Build'}
            </Button>
            {isBuilding && (
              <Button onClick={handleCancelBuild} variant="danger" className="flex items-center gap-2">
                <Square size={16} />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Build Progress</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Build Status */}
        {buildResult && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  {buildResult.success ? (
                    <CheckCircle2 size={24} className="text-green-600" />
                  ) : (
                    <AlertCircle size={24} className="text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {buildResult.success ? 'Success' : 'Failed'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{successfulTasks}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(totalDuration / 1000).toFixed(1)}s
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Duration</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {buildResult.artifacts.length}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Artifacts</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Build Tasks */}
      {tasks.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Build Tasks</h3>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Task Number */}
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 min-w-[30px] text-center">
                  {index + 1}.
                </div>

                {/* Task Status Icon */}
                <div className="flex-shrink-0">
                  {task.status === 'success' ? (
                    <CheckCircle2 size={18} className="text-green-600" />
                  ) : task.status === 'running' ? (
                    <Loader size={18} className="text-blue-600 animate-spin" />
                  ) : task.status === 'failed' ? (
                    <AlertCircle size={18} className="text-red-600" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>

                {/* Task Info */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</p>
                  {task.duration > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {(task.duration / 1000).toFixed(2)}s
                    </p>
                  )}
                  {task.details && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.details}</p>
                  )}
                </div>

                {/* Task Duration Badge */}
                {task.duration > 0 && (
                  <div className="text-xs font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                    {task.duration}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Build Console */}
      <div style={{ minHeight: '300px' }}>
        <EnhancedConsole logs={logs} onClear={handleClearLogs} showFilters={true} autoScroll={true} />
      </div>

      {/* Build Artifacts */}
      {buildResult && buildResult.artifacts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package size={20} />
            Generated Artifacts
          </h3>
          <div className="space-y-2">
            {buildResult.artifacts.map(artifact => (
              <div
                key={artifact.id}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{artifact.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {artifact.path} • {formatFileSize(artifact.size)}
                  </p>
                </div>
                <Button
                  onClick={() => handleDownloadArtifact(artifact.path, artifact.name)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Download size={14} />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Error Summary */}
      {buildResult && buildResult.errorSummary && buildResult.errorSummary.errorCount > 0 && (
        <Card className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Build Errors</h4>
              <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                {buildResult.errorSummary.criticalErrors.map((error, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-600 dark:text-red-400">▸</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

/**
 * Format bytes to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default BuildOutput;
