import type { Project } from '../types';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'custom';
  thumbnail?: string;
  defaultProject: Partial<Project>;
}

// Template data
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal Mod',
    description: 'A basic mod with just one custom block',
    icon: '🧱',
    category: 'beginner',
    defaultProject: {
      name: 'My Minimal Mod',
      description: 'A minimal Minecraft mod',
      mod_version: '1.0.0',
      minecraft_version: '1.20.1',
      mod_loader: 'forge',
    },
  },
  {
    id: 'tool-set',
    name: 'Tool Set',
    description: 'Create a complete tool set (sword, pickaxe, axe, shovel, hoe)',
    icon: '⚒️',
    category: 'intermediate',
    defaultProject: {
      name: 'Tool Set Mod',
      description: 'A mod with custom tools',
      mod_version: '1.0.0',
      minecraft_version: '1.20.1',
      mod_loader: 'forge',
    },
  },
  {
    id: 'food-mod',
    name: 'Food Mod',
    description: 'Create custom food items with nutrition values',
    icon: '🍎',
    category: 'intermediate',
    defaultProject: {
      name: 'Food Mod',
      description: 'A mod with custom foods',
      mod_version: '1.0.0',
      minecraft_version: '1.20.1',
      mod_loader: 'forge',
    },
  },
  {
    id: 'mob-mod',
    name: 'Mob Mod',
    description: 'Add custom hostile and passive mobs',
    icon: '👾',
    category: 'advanced',
    defaultProject: {
      name: 'Mob Mod',
      description: 'A mod with custom mobs',
      mod_version: '1.0.0',
      minecraft_version: '1.20.1',
      mod_loader: 'forge',
    },
  },
  {
    id: 'dimension-mod',
    name: 'Dimension Mod',
    description: 'Create a custom dimension with biomes',
    icon: '🌍',
    category: 'advanced',
    defaultProject: {
      name: 'Dimension Mod',
      description: 'A mod with a custom dimension',
      mod_version: '1.0.0',
      minecraft_version: '1.20.1',
      mod_loader: 'forge',
    },
  },
  {
    id: 'enchantment-mod',
    name: 'Enchantment Mod',
    description: 'Add custom enchantments',
    icon: '✨',
    category: 'advanced',
    defaultProject: {
      name: 'Enchantment Mod',
      description: 'A mod with custom enchantments',
      mod_version: '1.0.0',
      minecraft_version: '1.20.1',
      mod_loader: 'forge',
    },
  },
];

// Get template by ID
export const getTemplate = (id: string): ProjectTemplate | undefined => {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
};

// Get templates by category
export const getTemplatesByCategory = (category: ProjectTemplate['category']): ProjectTemplate[] => {
  return PROJECT_TEMPLATES.filter((t) => t.category === category);
};

// Create project from template
export const createProjectFromTemplate = (template: ProjectTemplate, projectName?: string): Partial<Project> => {
  return {
    ...template.defaultProject,
    name: projectName || template.defaultProject.name || template.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};
