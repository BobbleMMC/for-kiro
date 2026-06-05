import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  fileSave: (projectData: Record<string, any>) => ipcRenderer.invoke('file:save-project', projectData),
  fileLoad: () => ipcRenderer.invoke('file:load-project'),
  fileExport: (projectData: Record<string, any>, format: 'json' | 'zip') =>
    ipcRenderer.invoke('file:export-project', projectData, format),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-app-version'),
  getUserDataPath: () => ipcRenderer.invoke('app:get-user-data-path'),

  // Menu events
  onNewProject: (callback: () => void) => ipcRenderer.on('menu:new-project', callback),
  onOpenProject: (callback: () => void) => ipcRenderer.on('menu:open-project', callback),
  onSaveProject: (callback: () => void) => ipcRenderer.on('menu:save-project', callback),
  onImportProject: (callback: (data: Record<string, any>) => void) =>
    ipcRenderer.on('file:import-project', (event, data) => callback(data)),
  onExportProject: (callback: (data: Record<string, any>) => void) =>
    ipcRenderer.on('file:export-project', (event, data) => callback(data)),

  // Remove listeners
  removeListener: (channel: string) => ipcRenderer.removeAllListeners(channel),
});

export type ElectronAPI = {
  fileSave: (projectData: Record<string, any>) => Promise<{ success: boolean; path?: string; error?: string }>;
  fileLoad: () => Promise<{ success: boolean; path?: string; data?: Record<string, any>; error?: string }>;
  fileExport: (projectData: Record<string, any>, format: 'json' | 'zip') => Promise<{ success: boolean; path?: string; error?: string }>;
  getAppVersion: () => Promise<string>;
  getUserDataPath: () => Promise<string>;
  onNewProject: (callback: () => void) => void;
  onOpenProject: (callback: () => void) => void;
  onSaveProject: (callback: () => void) => void;
  onImportProject: (callback: (data: Record<string, any>) => void) => void;
  onExportProject: (callback: (data: Record<string, any>) => void) => void;
  removeListener: (channel: string) => void;
};

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
