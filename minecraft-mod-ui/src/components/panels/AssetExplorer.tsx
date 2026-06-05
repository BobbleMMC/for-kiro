import { FC, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File, Image, Code, Package } from 'lucide-react';

interface AssetItem {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'texture' | 'model' | 'code';
  children?: AssetItem[];
}

const mockAssets: AssetItem[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: 'blocks',
        name: 'blocks',
        type: 'folder',
        children: [
          { id: 'block1', name: 'CustomBlock.java', type: 'code' },
          { id: 'block2', name: 'OreBlock.java', type: 'code' },
        ],
      },
      {
        id: 'items',
        name: 'items',
        type: 'folder',
        children: [
          { id: 'item1', name: 'CustomItem.java', type: 'code' },
          { id: 'item2', name: 'SwordItem.java', type: 'code' },
        ],
      },
    ],
  },
  {
    id: 'resources',
    name: 'resources',
    type: 'folder',
    children: [
      {
        id: 'textures',
        name: 'textures',
        type: 'folder',
        children: [
          { id: 'tex1', name: 'block_texture.png', type: 'texture' },
          { id: 'tex2', name: 'item_texture.png', type: 'texture' },
        ],
      },
      {
        id: 'models',
        name: 'models',
        type: 'folder',
        children: [
          { id: 'model1', name: 'block_model.json', type: 'file' },
          { id: 'model2', name: 'item_model.json', type: 'file' },
        ],
      },
    ],
  },
  {
    id: 'gradle',
    name: 'build.gradle',
    type: 'code',
  },
  {
    id: 'mods_toml',
    name: 'mods.toml',
    type: 'file',
  },
];

interface TreeItemProps {
  item: AssetItem;
  onSelect: (id: string, type: string) => void;
}

const TreeItem: FC<TreeItemProps> = ({ item, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const isFolder = item.type === 'folder';
  const hasChildren = isFolder && item.children && item.children.length > 0;

  const getIcon = () => {
    switch (item.type) {
      case 'folder':
        return <Folder size={16} className="text-amber-400" />;
      case 'texture':
        return <Image size={16} className="text-pink-400" />;
      case 'code':
        return <Code size={16} className="text-blue-400" />;
      case 'model':
        return <Package size={16} className="text-purple-400" />;
      default:
        return <File size={16} className="text-slate-400" />;
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1 hover:bg-slate-700 rounded cursor-pointer text-sm text-slate-300 group"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          }
          onSelect(item.id, item.type);
        }}
      >
        {hasChildren && (
          <button
            className="p-0 hover:bg-slate-600 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
          </button>
        )}
        {!hasChildren && isFolder && <div className="w-4" />}
        {!isFolder && !hasChildren && <div className="w-4" />}
        {getIcon()}
        <span className="flex-1">{item.name}</span>
        {isFolder && hasChildren && (
          <span className="text-xs text-slate-500 group-hover:text-slate-400">
            {item.children?.length}
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="pl-2 border-l border-slate-700">
          {item.children?.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AssetExplorer: FC = () => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleSelect = (id: string, type: string) => {
    setSelectedItem(id);
    console.log(`Selected: ${id} (${type})`);
  };

  return (
    <div className="flex flex-col h-full p-3">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100">📁 Project Assets</h3>
        <p className="text-xs text-slate-400 mt-1">Forge Mod Project</p>
      </div>

      {/* Tree View */}
      <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {mockAssets.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Active: {mockAssets.length} items</span>
        </div>
      </div>
    </div>
  );
};
