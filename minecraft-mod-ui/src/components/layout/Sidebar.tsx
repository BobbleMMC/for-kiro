import type { FC } from 'react';
import { useState } from 'react';
import {
  Home,
  Package,
  Zap,
  Flame,
  BookOpen,
  ChevronRight,
  Scroll,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';

interface SidebarProps {
  currentPage: 'dashboard' | 'workspace';
  onPageChange: (page: 'dashboard' | 'workspace') => void;
}

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items?: Array<{ id: string; label: string; count?: number }>;
  expandable?: boolean;
}

const Sidebar: FC<SidebarProps> = () => {
  const { currentProject, blocks, items, recipes, entities } = useProjectStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content'])
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const sections: SidebarSection[] = [
    {
      id: 'project',
      label: 'Project',
      icon: <Home className="w-4 h-4" />,
      items: currentProject
        ? [
            { id: 'overview', label: 'Overview' },
            { id: 'settings', label: 'Settings' },
            { id: 'builds', label: 'Builds', count: currentProject.build_count },
          ]
        : [],
    },
    {
      id: 'content',
      label: 'Content',
      icon: <Package className="w-4 h-4" />,
      expandable: true,
      items: [
        { id: 'blocks', label: 'Blocks', count: blocks.length },
        { id: 'items', label: 'Items', count: items.length },
        { id: 'recipes', label: 'Recipes', count: recipes.length },
        { id: 'enchantments', label: 'Enchantments' },
        { id: 'entities', label: 'Entities', count: entities.length },
      ],
    },
    {
      id: 'world',
      label: 'World',
      icon: <Flame className="w-4 h-4" />,
      expandable: true,
      items: [
        { id: 'biomes', label: 'Biomes' },
        { id: 'dimensions', label: 'Dimensions' },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: <Zap className="w-4 h-4" />,
      items: [
        { id: 'armor', label: 'Armor Sets' },
        { id: 'tools', label: 'Tools' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {sections.map((section) => (
          <div key={section.id}>
            {/* Section Header */}
            <button
              onClick={() => section.expandable && toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-slate-600 dark:text-slate-400">{section.icon}</span>
              <span className="flex-1 text-left">{section.label}</span>
              {section.expandable && (
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    expandedSections.has(section.id) ? 'rotate-90' : ''
                  }`}
                />
              )}
            </button>

            {/* Section Items */}
            {(!section.expandable || expandedSections.has(section.id)) && section.items && (
              <div className="ml-2 mt-1 space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                  >
                    <span className="text-left flex-1">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-white bg-primary rounded-full group-hover:bg-primary-dark transition-colors">
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            {section.id !== 'tools' && (
              <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Resources */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <BookOpen className="w-4 h-4" />
          <span>Documentation</span>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <Scroll className="w-4 h-4" />
          <span>Changelog</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
