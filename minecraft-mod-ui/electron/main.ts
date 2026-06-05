import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
const preloadPath = path.join(__dirname, 'preload.js');

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

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
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
          label: 'Import Project...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openFile'],
              filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
            });
            if (!result.canceled && result.filePaths[0]) {
              const filePath = result.filePaths[0];
              const fileContent = fs.readFileSync(filePath, 'utf-8');
              mainWindow?.webContents.send('file:import-project', { path: filePath, data: fileContent });
            }
          },
        },
        {
          label: 'Export Project...',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow!, {
              filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
              defaultPath: 'mod-project.json',
            });
            if (!result.canceled) {
              mainWindow?.webContents.send('file:export-project', { path: result.filePath });
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => { app.quit(); },
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
          click: () => {
            shell.openExternal('https://github.com/BobbleMMC/for-kiro#readme');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

// IPC Handlers
ipcMain.handle('file:save-project', async (_event, projectData: Record<string, unknown>) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
      defaultPath: `${(projectData.name as string) || 'mod-project'}.json`,
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2));
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('file:load-project', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Minecraft Mod Projects', extensions: ['json'] }],
    });
    if (!result.canceled && result.filePaths[0]) {
      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return { success: true, path: filePath, data: JSON.parse(fileContent) };
    }
    return { success: false };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('file:export-project', async (_event, projectData: Record<string, unknown>, format: string) => {
  try {
    const ext = format === 'zip' ? 'zip' : 'json';
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [{ name: 'Export File', extensions: [ext] }],
      defaultPath: `${(projectData.name as string) || 'mod-project'}.${ext}`,
    });
    if (!result.canceled && result.filePath) {
      if (format === 'json') {
        fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2));
      }
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('app:get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('app:get-app-version', () => {
  return app.getVersion();
});
