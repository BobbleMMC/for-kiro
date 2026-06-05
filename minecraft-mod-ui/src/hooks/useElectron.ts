import { useCallback } from 'react';

const isElectron = () => {
  return !!(typeof window !== 'undefined' && (window as any).electron);
};

export const useElectron = () => {
  const electron = isElectron() ? (window as any).electron : null;

  const saveProject = useCallback(
    async (projectData: Record<string, any>) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.fileSave(projectData);
    },
    [electron]
  );

  const loadProject = useCallback(async () => {
    if (!electron) throw new Error('Electron API not available');
    return electron.fileLoad();
  }, [electron]);

  const exportProject = useCallback(
    async (projectData: Record<string, any>, format: 'json' | 'zip' = 'json') => {
      if (!electron) throw new Error('Electron API not available');
      return electron.fileExport(projectData, format);
    },
    [electron]
  );

  const getAppVersion = useCallback(async () => {
    if (!electron) return 'web';
    return electron.getAppVersion();
  }, [electron]);

  const getUserDataPath = useCallback(async () => {
    if (!electron) return '';
    return electron.getUserDataPath();
  }, [electron]);

  // Setup event listeners
  const onNewProject = useCallback((callback: () => void) => {
    if (!electron) return;
    electron.onNewProject(callback);
  }, [electron]);

  const onOpenProject = useCallback((callback: () => void) => {
    if (!electron) return;
    electron.onOpenProject(callback);
  }, [electron]);

  const onSaveProject = useCallback((callback: () => void) => {
    if (!electron) return;
    electron.onSaveProject(callback);
  }, [electron]);

  const onImportProject = useCallback((callback: (data: Record<string, any>) => void) => {
    if (!electron) return;
    electron.onImportProject(callback);
  }, [electron]);

  const onExportProject = useCallback((callback: (data: Record<string, any>) => void) => {
    if (!electron) return;
    electron.onExportProject(callback);
  }, [electron]);

  const removeListener = useCallback((channel: string) => {
    if (!electron) return;
    electron.removeListener(channel);
  }, [electron]);

  return {
    isElectron,
    saveProject,
    loadProject,
    exportProject,
    getAppVersion,
    getUserDataPath,
    onNewProject,
    onOpenProject,
    onSaveProject,
    onImportProject,
    onExportProject,
    removeListener,
  };
};
