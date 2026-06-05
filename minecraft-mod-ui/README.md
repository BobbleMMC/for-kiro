# 🎮 Minecraft Mod Generator - React UI

Complete React + TypeScript UI for the Minecraft Mod Generator desktop application.

## 🚀 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Vite** - Build tool
- **Lucide React** - Icons
- **Electron Ready** - Desktop app integration

## 📦 Installation

```bash
cd minecraft-mod-ui
npm install
```

## 🛠️ Development

```bash
npm run dev
```

Runs the development server at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx              # Main app layout
│   │   ├── Sidebar.tsx             # Left sidebar navigation
│   │   ├── Header.tsx              # Top header with title
│   │   └── MainContent.tsx         # Center content area
│   ├── pages/
│   │   ├── Dashboard.tsx           # Project list and stats
│   │   └── Workspace.tsx           # Project editor
│   ├── editors/
│   │   ├── BlockEditor.tsx         # Block form editor
│   │   ├── ItemEditor.tsx          # Item form editor
│   │   ├── RecipeEditor.tsx        # Recipe crafting editor
│   │   └── EntityEditor.tsx        # Entity/Mob editor
│   └── common/
│       ├── Button.tsx              # Reusable button
│       ├── Modal.tsx               # Modal dialog
│       ├── FileExplorer.tsx        # File tree
│       ├── CodeEditor.tsx          # Code display
│       └── Console.tsx             # Build/log console
├── stores/
│   └── projectStore.ts             # Zustand state store
├── hooks/
│   ├── useProject.ts               # Project operations
│   ├── useContent.ts               # Block/Item/Recipe ops
│   └── useBuild.ts                 # Build operations
├── services/
│   ├── api.ts                      # Backend API calls
│   ├── database.ts                 # Database operations
│   └── electron.ts                 # Electron IPC bridge
├── types/
│   └── index.ts                    # TypeScript types
├── utils/
│   ├── formatting.ts               # Format utilities
│   └── validators.ts               # Input validation
├── App.tsx                         # Root component
├── main.tsx                        # Entry point
└── index.css                       # Global styles
```

## 🎯 Features (Implementation Plan)

### Phase 1: Core Layout ✅ In Progress
- [x] TypeScript setup
- [x] Tailwind CSS configured
- [x] Zustand store setup
- [ ] Responsive layout components
- [ ] Navigation system
- [ ] State management integration

### Phase 2: Dashboard
- [ ] Project list view
- [ ] Project statistics
- [ ] Create/Edit/Delete projects
- [ ] Quick actions

### Phase 3: Workspace Editor
- [ ] File explorer tree
- [ ] Code editor integration
- [ ] Properties panel
- [ ] Real-time preview

### Phase 4: Content Editors
- [ ] Block editor with visual form
- [ ] Item editor
- [ ] Recipe editor with grid
- [ ] Entity/Mob editor

### Phase 5: Build & Console
- [ ] Build log display
- [ ] Real-time console output
- [ ] Agent task status
- [ ] Error/warning display

### Phase 6: Polish & Integration
- [ ] Electron integration
- [ ] API integration with backend
- [ ] Keyboard shortcuts
- [ ] Theme support (light/dark)

## 📊 Component Architecture

### Layout Structure
```
┌─────────────────────────────────────────────┐
│            Header (Logo, Title)             │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Sidebar     │  MainContent                │
│  (Nav)       │  ├─ Dashboard               │
│              │  │  or                      │
│  - Projects  │  ├─ Workspace               │
│  - Blocks    │  │  ├─ FileExplorer        │
│  - Items     │  │  ├─ CodeEditor          │
│  - Recipes   │  │  ├─ PropertiesPanel     │
│  - Builds    │  │  └─ Console             │
│              │  └─ ...                     │
├──────────────┴──────────────────────────────┤
│         Console/Log Footer (optional)       │
└─────────────────────────────────────────────┘
```

## 🔄 State Management (Zustand)

All state is centralized in `projectStore.ts`:

```typescript
import { useProjectStore } from './stores/projectStore';

// In components:
const { currentProject, blocks, items, addBlock } = useProjectStore();

// Update state:
addBlock(newBlock);
updateBlock(modifiedBlock);
deleteBlock(blockId);
```

### Available State Slices
- **Projects**: CRUD operations, current project
- **Blocks**: Block management
- **Items**: Item management
- **Recipes**: Recipe management
- **Entities**: Entity/Mob management
- **Console**: Log messages
- **UI**: Selected items, filters, loading state

## 🎨 Styling with Tailwind CSS

All components use Tailwind utility classes:

```typescript
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
  Click me
</button>
```

Custom colors defined in `tailwind.config.js`:
- `primary` (#667eea)
- `primary-dark` (#764ba2)
- `secondary` (#f093fb)

## 🖥️ Electron Integration

The UI is designed to work with Electron. Key integration points:

### IPC Communication (Frontend)
```typescript
// Send message to main process
window.electron.send('build:start', { projectId: 1 });

// Listen for main process events
window.electron.on('build:complete', (data) => {
  console.log('Build finished:', data);
});
```

### Directory Structure for Electron
```
minecraft-mod-generator/
├── src/                    # This React app
├── electron/               # Electron main process
│   ├── main.ts
│   ├── preload.ts
│   └── ipc.ts
├── dist/                   # Built React app
└── package.json
```

## 🔌 Backend Integration

### Database API Service
Located in `src/services/api.ts`:

```typescript
import { apiClient } from './api';

// Create project
const project = await apiClient.projects.create({
  name: 'MyMod',
  minecraft_version: '1.20.1',
  // ...
});

// Get all blocks
const blocks = await apiClient.blocks.getByProject(projectId);

// Update item
await apiClient.items.update(itemId, updatedData);
```

## 🧪 Testing

```bash
npm run type-check   # TypeScript type checking
npm run lint         # ESLint code linting
```

## 🚀 Building for Production

```bash
npm run build
```

Creates optimized production build in `dist/` directory.

## 📝 Component Examples

### Creating a New Component
```typescript
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

const MyComponent: FC<MyComponentProps> = ({ title, onClick }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button 
        onClick={onClick}
        className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
      >
        Action
      </button>
    </div>
  );
};

export default MyComponent;
```

### Using Store in Component
```typescript
import { useProjectStore } from '../stores/projectStore';

const MyComponent = () => {
  const { currentProject, blocks, addBlock } = useProjectStore();

  const handleAddBlock = () => {
    addBlock({
      id: blocks.length + 1,
      project_id: currentProject!.id,
      block_name: 'new_block',
      // ...
    });
  };

  return (
    <div>
      <h1>{currentProject?.name}</h1>
      <button onClick={handleAddBlock}>Add Block</button>
    </div>
  );
};

export default MyComponent;
```

## 🔐 TypeScript Types

All types are defined in `src/types/index.ts`:
- `Project`, `Block`, `Item`, `Recipe`, `EntityType`, `BuildLog`, `AgentTask`
- Helper types: `ProjectStats`, `ConsoleMessage`, `EditorState`

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand Store](https://github.com/pmndrs/zustand)
- [Vite Guide](https://vitejs.dev/guide/)
- [Lucide Icons](https://lucide.dev)

## 🤝 Contributing

1. Follow the component structure
2. Use TypeScript for type safety
3. Add Tailwind CSS for styling
4. Keep components small and focused
5. Document complex logic

## 📄 License

Part of Minecraft Mod Generator project

---

**Status**: Phase 1 - Setup Complete  
**Next Phase**: Core Layout Components  
**Updated**: 2024
