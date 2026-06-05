import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Check if we're in development mode
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
const preloadPath = path.join(__dirname, 'preload.js');

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load the app
  if (isDev) {
    // Load from development server
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.openDevTools();
  } else {
    // Load from production build
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-project');
          },
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu:open-project');
          },
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save-project');
          },
        },
        { type: 'separator' },
        {
          label: 'Import',
          submenu: [
            {
              label: 'Import Project...',
              click: async () => {
                const result = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
                  properties: ['openFile'],
                  filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
                });

                if (!result.canceled) {
                  const filePath = result.filePaths[0];
                  const fileContent = fs.readFileSync(filePath, 'utf-8');
                  mainWindow?.webContents.send('file:import-project', { path: filePath, data: fileContent });
                }
              },
            },
          ],
        },
        {
          label: 'Export',
          submenu: [
            {
              label: 'Export Project...',
              click: async () => {
                const result = await dialog.showSaveDialog(mainWindow as BrowserWindow, {
                  filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
                  defaultPath: 'mod-project.json',
                });

                if (!result.canceled) {
                  mainWindow?.webContents.send('file:export-project', { path: result.filePath });
                }
              },
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = await import('electron');
            shell.openExternal('https://github.com/BobbleMMC/for-kiro#readme');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

// App event listeners
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for file operations
ipcMain.handle('file:save-project', async (event: any, projectData: Record<string, any>) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow as BrowserWindow, {
      filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
      defaultPath: `${projectData.name || 'mod-project'}.json`,
    });

    if (!result.canceled) {
      fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2));
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error) {
    console.error('Save project error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('file:load-project', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
    });

    if (!result.canceled) {
      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return { success: true, path: filePath, data: JSON.parse(fileContent) };
    }
    return { success: false };
  } catch (error) {
    console.error('Load project error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('file:export-project', async (event: any, projectData: Record<string, any>, format: 'json' | 'zip') => {
  try {
    const result = await dialog.showSaveDialog(mainWindow as BrowserWindow, {
      filters: [{ name: 'Export File', extensions: [format === 'zip' ? 'zip' : 'json'] }],
      defaultPath: `${projectData.name || 'mod-project'}.${format}`,
    });

    if (!result.canceled) {
      if (format === 'json') {
        fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2));
      }
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error) {
    console.error('Export project error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('app:get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('app:get-app-version', () => {
  return app.getVersion();
});

// Add security headers and CSP
if (isDev) {
  // Development: use Vite dev server
} else {
  // Production: add security headers
  app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'file://') {
        event.preventDefault();
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) {
        return { action: 'allow' };
      }
      return { action: 'deny' };
    });
  });
}

export {};
