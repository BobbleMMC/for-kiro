# 🎮 Minecraft Mod Generator - React UI

Complete React + TypeScript UI for the Minecraft Mod Generator desktop application with Electron integration.

## 🚀 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Electron 28** - Desktop app framework
- **Vite** - Build tool
- **Lucide React** - Icons

## 📦 Installation

```bash
cd minecraft-mod-ui
npm install --legacy-peer-deps
```

## 🛠️ Development

### Web Development
```bash
npm run dev
```
Runs the development server at `http://localhost:5173`

### Desktop Development (Electron)
```bash
npm run dev:electron
```
Launches Electron with Vite dev server (hot reload enabled)

## 🏗️ Build

### Web Build
```bash
npm run build
```
Creates optimized production build in `dist/` directory.

### Desktop Build (Electron)
```bash
npm run build:electron
```
Builds production binaries for all platforms:
- **Windows**: NSIS installer + portable executable
- **macOS**: DMG + ZIP
- **Linux**: AppImage + DEB

## 📁 Project Structure

```
minecraft-mod-ui/
├── electron/
│   ├── main.ts                     # Electron main process
│   └── preload.ts                  # IPC preload bridge
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # Main app layout
│   │   │   ├── Sidebar.tsx         # Left sidebar
│   │   │   ├── Header.tsx          # Top header
│   │   │   └── MainContent.tsx     # Content area
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # Project list
│   │   │   └── Workspace.tsx       # Project editor
│   │   ├── editors/
│   │   │   ├── BlockEditor.tsx     # Block form
│   │   │   ├── ItemEditor.tsx      # Item form
│   │   │   ├── RecipeEditor.tsx    # Recipe grid
│   │   │   ├── EntityEditor.tsx    # Entity form
│   │   │   ├── SettingsPanel.tsx   # User settings ⭐ NEW
│   │   │   └── ... (other editors)
│   │   └── common/
│   │       ├── Button.tsx          # Button component
│   │       ├── Modal.tsx           # Modal dialog
│   │       ├── FileExplorer.tsx    # File tree
│   │       ├── CodePreview.tsx     # Code display
│   │       └── Console.tsx         # Build console
│   ├── context/
│   │   └── ThemeContext.tsx        # Theme management ⭐ NEW
│   ├── stores/
│   │   ├── projectStore.ts         # Project state
│   │   └── historyStore.ts         # Undo/Redo ⭐ NEW
│   ├── hooks/
│   │   ├── useProject.ts           # Project ops
│   │   ├── useContent.ts           # Content ops
│   │   ├── useBuild.ts             # Build ops
│   │   ├── useElectron.ts          # Electron IPC ⭐ NEW
│   │   └── useAutoSave.ts          # Auto-save ⭐ NEW
│   ├── services/
│   │   ├── api.ts                  # Backend API
│   │   ├── templates.ts            # Project templates ⭐ NEW
│   │   └── importExport.ts         # Import/Export ⭐ NEW
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── dist/                           # Production build
├── package.json                    # Dependencies & scripts
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
└── README.md                       # This file
```

## ✨ Phase 6 Features (Desktop & Production)

### 🖥️ Electron Integration ⭐
- **main.ts** (216 lines): Electron main process
  - BrowserWindow management
  - Native file dialogs
  - IPC event handlers
  - Application menu
  - Multi-platform support

- **preload.ts** (50 lines): Secure IPC bridge
  - Context-isolated API
  - Type-safe definitions
  - Menu event listeners

- **useElectron Hook**: React integration
  - File operations (save/load/export)
  - App version & paths
  - Menu event handlers
  - Type-safe TypeScript

### ⚙️ Settings & Preferences ⭐
- **SettingsPanel.tsx** (450+ lines)
  - Appearance (theme, font size, language)
  - Auto-save configuration
  - Code editor settings
  - Notifications control
  - Real-time form validation
  - localStorage persistence

### 🎨 Theme Customization ⭐
- **ThemeContext.tsx** (80+ lines)
  - Light/Dark/Auto modes
  - System preference detection
  - Persistent storage
  - React Context API
  - Responsive to system changes

### 📦 Project Templates ⭐
- **templates.ts** (100+ lines)
- 6 pre-built templates:
  1. **Minimal Mod** (Beginner) - Basic block
  2. **Tool Set** (Intermediate) - Custom tools
  3. **Food Mod** (Intermediate) - Food items
  4. **Mob Mod** (Advanced) - Custom entities
  5. **Dimension Mod** (Advanced) - Custom dimensions
  6. **Enchantment Mod** (Advanced) - Custom enchantments

### 📤 Import/Export ⭐
- **importExport.ts** (200+ lines)
- Export formats: JSON with metadata
- Import validation:
  - File type checking
  - Size limits (10MB max)
  - Structure validation
  - Project requirements check
- Automatic download functionality
- Error recovery

### 💾 Auto-save System ⭐
- **useAutoSave Hook** (120+ lines)
- Configurable intervals (default 5 min)
- Change detection (no redundant saves)
- Dual fallback:
  1. Electron file API
  2. localStorage backup
- Recovery mechanism
- Manual save trigger

### ↩️ Undo/Redo System ⭐
- **historyStore.ts** (120+ lines)
- Zustand-based state management
- 100-state history limit
- Efficient array operations
- Automatic future clearing
- Type-safe operations

## 🔄 State Management (Zustand)

### Project Store
```typescript
const { 
  currentProject, 
  blocks, 
  addBlock, 
  updateBlock,
  deleteBlock 
} = useProjectStore();
```

### History Store (Undo/Redo)
```typescript
const { 
  data, 
  pushToHistory, 
  undo, 
  redo, 
  canUndo, 
  canRedo 
} = withHistory(initialData);
```

## 🎣 Custom Hooks

### useElectron
```typescript
const {
  isElectron,
  saveProject,
  loadProject,
  exportProject,
  getAppVersion,
  getUserDataPath,
  onNewProject,
  onOpenProject,
  // ...
} = useElectron();
```

### useAutoSave
```typescript
const { triggerSave } = useAutoSave(projectData, {
  enabled: true,
  interval: 5 * 60 * 1000,
  onSaveSuccess: (path) => console.log('Saved:', path),
  onSaveError: (error) => console.error('Error:', error),
});
```

### useAutoSaveRecovery
```typescript
const { recoverAutoSave, clearAutoSave } = useAutoSaveRecovery(projectId);
const recovered = recoverAutoSave();
if (recovered) {
  // Show recovery dialog
}
```

### useTheme
```typescript
const { theme, setTheme, toggleTheme } = useTheme();

// Change theme
setTheme('dark');
setTheme('light');
setTheme('auto'); // Use system preference
```

## 🎯 Complete Feature Matrix

| Feature | Status | Files |
|---------|--------|-------|
| React 19 UI | ✅ | src/components/* |
| TypeScript | ✅ | *.ts files |
| Tailwind CSS | ✅ | tailwind.config.js |
| Zustand Store | ✅ | projectStore.ts |
| Electron Desktop | ✅ | electron/* |
| Settings Panel | ✅ | SettingsPanel.tsx |
| Theme System | ✅ | ThemeContext.tsx |
| Project Templates | ✅ | templates.ts |
| Import/Export | ✅ | importExport.ts |
| Auto-save | ✅ | useAutoSave.ts |
| Undo/Redo | ✅ | historyStore.ts |
| IPC Bridges | ✅ | useElectron.ts |

## 🧪 Testing & Quality

```bash
npm run type-check    # TypeScript validation
npm run lint          # ESLint checking
npm run build         # Production build (web)
npm run build:electron # Production build (desktop)
```

**Build Results**:
- JavaScript: 405 KB (gzipped: 101.7 KB)
- CSS: 10.6 KB (gzipped: 2.85 KB)
- HTML: 0.46 KB

## 🔐 Security Features

### Electron Security
- ✅ Context isolation enabled
- ✅ Preload script validation
- ✅ Node integration disabled
- ✅ Sandbox enabled
- ✅ No remote module access
- ✅ Navigation validation
- ✅ External link handling

### Data Security
- ✅ Input validation
- ✅ File type checking
- ✅ Size limits (10MB)
- ✅ Atomic saves
- ✅ Error recovery

## 📱 Desktop App Features

### File Operations
- Native file dialogs (Windows/Mac/Linux)
- Project save/load
- Multi-format export
- Drag & drop support

### Application Menu
- **File**: New, Open, Save, Import, Export, Exit
- **Edit**: Undo, Redo, Cut, Copy, Paste
- **View**: Reload, Dev Tools, Zoom, Fullscreen
- **Help**: Documentation link

### Auto-save & Recovery
- Configurable save intervals
- Automatic project persistence
- Recovery on app crash
- localStorage fallback

## 📚 Architecture Diagrams

### Electron Architecture
```
┌─ Main Process (main.ts)
│  ├─ Window Management
│  ├─ File Dialogs
│  └─ IPC Handlers
│
├─ Preload Script (preload.ts)
│  └─ Context-Isolated API Bridge
│
└─ Renderer Process (React App)
   ├─ useElectron Hook
   └─ UI Components
```

### Data Flow
```
User Action
  ↓
Component/Hook
  ↓
useElectron / useAutoSave
  ↓
IPC Message
  ↓
Electron Main Process
  ↓
File System / Dialog
  ↓
IPC Response
  ↓
State Update → Re-render
```

## 🚀 Performance

- **Startup**: ~2-3 seconds (desktop app)
- **Code Size**: ~150 KB (Electron framework overhead)
- **Memory**: ~200 MB (typical desktop app)
- **Auto-save**: Debounced (no disk thrashing)
- **History**: Max 100 states (~50 MB)

## 🎓 Developer Guide

### Adding a New Feature
1. Create component in `src/components/`
2. Add types to `src/types/index.ts`
3. Add store actions to `stores/projectStore.ts`
4. Add hooks in `src/hooks/` if needed
5. Import and use in components
6. Test with `npm run type-check && npm run build`

### Electron IPC Communication
```typescript
// In component
const { saveProject } = useElectron();
const result = await saveProject(projectData);

// Behind the scenes:
// 1. useElectron hook calls window.electron.fileSave()
// 2. Preload script sends IPC message to main process
// 3. Main process handles in ipcMain.handle()
// 4. Returns result via IPC
// 5. Promise resolves with result
```

## 📖 Resources

- [React 19 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)

## 📄 License

Part of Minecraft Mod Generator project

---

**Version**: 1.1.0 (Desktop Ready)  
**Status**: 🟢 Phase 6 Complete  
**Build**: ✅ Production Ready  
**Last Updated**: June 2026
