import type { FC } from 'react';
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../common';
import type { Block } from '../../types';

interface BlockEditorProps {
  block?: Block;
  projectId: number;
  onSave: (block: Omit<Block, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const materialTypes = ['stone', 'dirt', 'wood', 'ore', 'metal', 'glass', 'fabric', 'decorative', 'other'] as const;

const BlockEditor: FC<BlockEditorProps> = ({ block, projectId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    block_name: block?.block_name || '',
    display_name: block?.display_name || '',
    namespace: block?.namespace || '',
    hardness: block?.hardness || 1.5,
    resistance: block?.resistance || 6.0,
    slipperiness: block?.slipperiness || 0.6,
    speed_factor: block?.speed_factor || 1.0,
    friction_factor: block?.friction_factor || 0.4,
    luminance: block?.luminance || 0,
    is_replaceable: block?.is_replaceable || false,
    is_solid: block?.is_solid || true,
    has_collision: block?.has_collision || true,
    is_full_block: block?.is_full_block || true,
    has_gravity: block?.has_gravity || false,
    is_flammable: block?.is_flammable || false,
    flammability_level: block?.flammability_level || 0,
    material_type: block?.material_type || 'stone' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      project_id: projectId,
      ...formData,
      texture_top: block?.texture_top,
      texture_bottom: block?.texture_bottom,
      texture_side: block?.texture_side,
      texture_all: block?.texture_all,
      custom_model_data: block?.custom_model_data,
      fire_spreadability: block?.fire_spreadability || 0,
      can_be_hydrated: block?.can_be_hydrated || false,
    } as any);
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 p-6">
        {/* Basic Properties */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Basic Properties</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Block Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.block_name}
                  onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="custom_ore"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="Custom Ore"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Namespace
                </label>
                <input
                  type="text"
                  value={formData.namespace}
                  onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="mymod"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Material Type
                </label>
                <select
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  {materialTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Physical Properties */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Physical Properties</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hardness
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.hardness}
                  onChange={(e) => setFormData({ ...formData, hardness: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resistance
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.resistance}
                  onChange={(e) => setFormData({ ...formData, resistance: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Luminance (0-15)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={formData.luminance}
                  onChange={(e) => setFormData({ ...formData, luminance: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Block Flags */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Block Flags</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_solid}
                onChange={(e: any) => setFormData({ ...formData, is_solid: e.target.checked })}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Is Solid</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_collision}
                onChange={(e: any) => setFormData({ ...formData, has_collision: e.target.checked })}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Has Collision</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_full_block}
                onChange={(e: any) => setFormData({ ...formData, is_full_block: e.target.checked })}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Is Full Block</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_gravity}
                onChange={(e) => setFormData({ ...formData, has_gravity: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Has Gravity</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_replaceable}
                onChange={(e) => setFormData({ ...formData, is_replaceable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Is Replaceable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_flammable}
                onChange={(e) => setFormData({ ...formData, is_flammable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Is Flammable</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Block Preview</h3>
          <div className="flex items-center justify-center bg-white dark:bg-slate-600 rounded-lg p-8 h-32">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center mb-2">
                <span className="text-white font-bold text-xs text-center px-2">
                  {formData.display_name}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Hardness: {formData.hardness} | Light: {formData.luminance}
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} icon={<X className="w-4 h-4" />}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} icon={<Save className="w-4 h-4" />}>
          Save Block
        </Button>
      </div>
    </div>
  );
};

export default BlockEditor;
