import { FC, useState } from 'react';
import { Settings2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

interface PropertyGroup {
  name: string;
  properties: Property[];
}

interface Property {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'select';
  value: any;
  options?: string[];
}

const mockProperties: PropertyGroup[] = [
  {
    name: 'Transform',
    properties: [
      { name: 'Position X', type: 'number', value: 0 },
      { name: 'Position Y', type: 'number', value: 0 },
      { name: 'Position Z', type: 'number', value: 0 },
      { name: 'Rotation', type: 'number', value: 0 },
      { name: 'Scale', type: 'number', value: 1 },
    ],
  },
  {
    name: 'Material',
    properties: [
      { name: 'Color', type: 'color', value: '#ffffff' },
      { name: 'Metallic', type: 'number', value: 0.5 },
      { name: 'Roughness', type: 'number', value: 0.5 },
      { name: 'Emissive', type: 'color', value: '#000000' },
    ],
  },
  {
    name: 'Physics',
    properties: [
      { name: 'Mass', type: 'number', value: 1 },
      { name: 'Friction', type: 'number', value: 0.3 },
      { name: 'Bounciness', type: 'number', value: 0 },
      { name: 'Gravity', type: 'boolean', value: true },
    ],
  },
];

interface PropertyRowProps {
  property: Property;
  onChange: (value: any) => void;
}

const PropertyRow: FC<PropertyRowProps> = ({ property, onChange }) => {
  switch (property.type) {
    case 'number':
      return (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">{property.name}</label>
          <input
            type="number"
            value={property.value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            step="0.1"
          />
        </div>
      );

    case 'string':
      return (
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-300">{property.name}</label>
          <input
            type="text"
            value={property.value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 max-w-32 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">{property.name}</label>
          <input
            type="checkbox"
            checked={property.value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border border-slate-600 bg-slate-700 cursor-pointer accent-blue-500"
          />
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-300">{property.name}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={property.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded border border-slate-600 cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-mono">{property.value}</span>
          </div>
        </div>
      );

    case 'select':
      return (
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-300">{property.name}</label>
          <select
            value={property.value}
            onChange={(e) => onChange(e.target.value)}
            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {property.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    default:
      return null;
  }
};

interface PropertyGroupRowProps {
  group: PropertyGroup;
}

const PropertyGroupRow: FC<PropertyGroupRowProps> = ({ group }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-sm font-semibold text-slate-200 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
        <span>{group.name}</span>
        <span className="text-xs text-slate-500 ml-auto">({group.properties.length})</span>
      </button>

      {expanded && (
        <div className="px-3 py-2 space-y-2 bg-slate-800/30 rounded border border-slate-700/50">
          {group.properties.map((prop, idx) => (
            <PropertyRow
              key={idx}
              property={prop}
              onChange={(value) => console.log(`Changed ${prop.name} to ${value}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SmartInspector: FC = () => {
  const [selectedObject, _] = useState<string | null>('CustomBlock');

  return (
    <div className="flex flex-col h-full p-3 bg-slate-800">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 size={16} className="text-blue-400" />
          <h3 className="text-sm font-bold text-slate-100">Properties</h3>
        </div>
        {selectedObject ? (
          <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300 font-mono">
            Selected: {selectedObject}
          </div>
        ) : (
          <div className="text-xs text-slate-500">No selection</div>
        )}
      </div>

      {/* Properties */}
      {selectedObject ? (
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {mockProperties.map((group, idx) => (
            <PropertyGroupRow key={idx} group={group} />
          ))}

          {/* Delete Button */}
          <button className="w-full mt-4 pt-3 border-t border-slate-700 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded text-sm text-red-400 transition-colors">
            <Trash2 size={16} />
            Delete Object
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Settings2 size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Select an object to view properties</p>
          </div>
        </div>
      )}
    </div>
  );
};
