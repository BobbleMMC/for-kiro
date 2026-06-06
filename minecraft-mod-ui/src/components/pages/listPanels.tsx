/**
 * List-view wrappers around single-asset editors.
 *
 * BlockEditor / ItemEditor are designed to edit *one* item with onSave/onCancel
 * callbacks. To make them dockable, we render a list of project items and let
 * the user pick one to edit, persisting changes back to the Zustand store.
 */
import { useState, type FC } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import BlockEditor from '../editors/BlockEditor';
import ItemEditor from '../editors/ItemEditor';
import { useProjectStore } from '../../stores/projectStore';
import type { Block, Item } from '../../types';

// ===== Block List Panel =====

export const BlockListPanel: FC = () => {
  const { blocks, currentProject, addBlock, updateBlock, deleteBlock } = useProjectStore();
  const [editing, setEditing] = useState<Block | null>(null);
  const [creating, setCreating] = useState(false);

  if (!currentProject) {
    return <EmptyMessage text="No project loaded." />;
  }

  if (creating || editing) {
    return (
      <BlockEditor
        block={editing ?? undefined}
        projectId={currentProject.id}
        onSave={(data) => {
          if (editing) {
            updateBlock({ ...editing, ...data, updated_at: new Date().toISOString() });
          } else {
            const newBlock: Block = {
              ...data,
              id: Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            addBlock(newBlock);
          }
          setEditing(null);
          setCreating(false);
        }}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <span className="text-xs font-bold text-slate-200">Blocks ({blocks.length})</span>
        <div className="flex-1" />
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-[10px] text-white"
        >
          <Plus size={10} /> New Block
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {blocks.length === 0 ? (
          <EmptyMessage text="No blocks yet. Click New Block to create one." />
        ) : (
          blocks.map((b) => (
            <AssetRow
              key={b.id}
              name={b.display_name || b.block_name}
              subtitle={`${b.material_type} · hardness ${b.hardness}`}
              onEdit={() => setEditing(b)}
              onDelete={() => deleteBlock(b.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ===== Item List Panel =====

export const ItemListPanel: FC = () => {
  const { items, currentProject, addItem, updateItem, deleteItem } = useProjectStore();
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  if (!currentProject) {
    return <EmptyMessage text="No project loaded." />;
  }

  if (creating || editing) {
    return (
      <ItemEditor
        item={editing ?? undefined}
        projectId={currentProject.id}
        onSave={(data) => {
          if (editing) {
            updateItem({ ...editing, ...data, updated_at: new Date().toISOString() });
          } else {
            const newItem: Item = {
              ...data,
              id: Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            addItem(newItem);
          }
          setEditing(null);
          setCreating(false);
        }}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <span className="text-xs font-bold text-slate-200">Items ({items.length})</span>
        <div className="flex-1" />
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-[10px] text-white"
        >
          <Plus size={10} /> New Item
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.length === 0 ? (
          <EmptyMessage text="No items yet. Click New Item to create one." />
        ) : (
          items.map((i) => (
            <AssetRow
              key={i.id}
              name={i.display_name || i.item_name}
              subtitle={`${i.rarity} · stack ${i.max_stack_size}`}
              onEdit={() => setEditing(i)}
              onDelete={() => deleteItem(i.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ===== Helpers =====

const EmptyMessage: FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center h-full text-xs text-slate-500 p-4 text-center">
    {text}
  </div>
);

const AssetRow: FC<{
  name: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ name, subtitle, onEdit, onDelete }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 group">
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-slate-200 truncate">{name}</div>
      <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>
    </div>
    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={onEdit}
        className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400"
        title="Edit"
      >
        <Edit2 size={10} />
      </button>
      <button
        onClick={onDelete}
        className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400"
        title="Delete"
      >
        <Trash2 size={10} />
      </button>
    </div>
  </div>
);
