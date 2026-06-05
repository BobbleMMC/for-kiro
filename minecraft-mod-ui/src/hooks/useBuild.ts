import { useProjectStore } from '../stores/projectStore';
import type { BuildLog, ConsoleMessage } from '../types';

/**
 * Hook for build operations and console output
 */
export const useBuild = () => {
  const {
    buildLogs,
    consoleLogs,
    addBuildLog,
    addConsoleMessage,
    clearConsole,
  } = useProjectStore();

  const createBuildLog = (buildData: Omit<BuildLog, 'id' | 'created_at'>) => {
    const newLog: BuildLog = {
      id: buildLogs.length + 1,
      ...buildData,
      created_at: new Date().toISOString(),
    };

    addBuildLog(newLog);
    return newLog;
  };

  const addLog = (message: string, level: 'info' | 'warning' | 'error' | 'success' = 'info', source?: string) => {
    const consoleMessage: ConsoleMessage = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      source,
    };

    addConsoleMessage(consoleMessage);
  };

  const getProjectBuilds = (projectId: number) => {
    return buildLogs.filter(log => log.project_id === projectId);
  };

  const getLatestBuild = (projectId: number) => {
    const projectBuilds = getProjectBuilds(projectId);
    return projectBuilds.length > 0 ? projectBuilds[projectBuilds.length - 1] : null;
  };

  const getBuildStats = (projectId: number) => {
    const projectBuilds = getProjectBuilds(projectId);
    return {
      total: projectBuilds.length,
      successful: projectBuilds.filter(b => b.status === 'success').length,
      failed: projectBuilds.filter(b => b.status === 'failed').length,
      warnings: projectBuilds.filter(b => b.status === 'warning').length,
      averageBuildTime: projectBuilds.length > 0
        ? projectBuilds.reduce((sum, b) => sum + (b.build_time_ms || 0), 0) / projectBuilds.length
        : 0,
    };
  };

  return {
    buildLogs,
    consoleLogs,
    createBuildLog,
    addLog,
    clearConsole,
    getProjectBuilds,
    getLatestBuild,
    getBuildStats,
  };
};
