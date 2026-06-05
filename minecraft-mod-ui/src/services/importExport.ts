import type { Project } from '../types';

export interface ExportOptions {
  format: 'json' | 'zip';
  includeAssets?: boolean;
  includeBuildData?: boolean;
  compressImages?: boolean;
}

export interface ImportResult {
  success: boolean;
  project?: Partial<Project>;
  error?: string;
}

/**
 * Export project to JSON format
 */
export const exportProjectAsJSON = (projectData: any): string => {
  try {
    const export_data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      project: projectData,
    };

    return JSON.stringify(export_data, null, 2);
  } catch (error) {
    throw new Error(`Failed to export project: ${(error as Error).message}`);
  }
};

/**
 * Export project as blob (downloadable)
 */
export const exportProjectAsBlob = (projectData: any): Blob => {
  const jsonString = exportProjectAsJSON(projectData);
  return new Blob([jsonString], { type: 'application/json' });
};

/**
 * Download exported project
 */
export const downloadExportedProject = (projectData: any, fileName?: string): void => {
  try {
    const blob = exportProjectAsBlob(projectData);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${projectData.name || 'project'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to download project: ${(error as Error).message}`);
  }
};

/**
 * Import project from JSON file
 */
export const importProjectFromJSON = (jsonContent: string): ImportResult => {
  try {
    const parsed = JSON.parse(jsonContent);

    // Validate structure
    if (!parsed.project) {
      return {
        success: false,
        error: 'Invalid project file: missing project data',
      };
    }

    // Validate project has required fields
    const project = parsed.project;
    if (!project.name || !project.minecraft_version || !project.mod_loader) {
      return {
        success: false,
        error: 'Invalid project: missing required fields (name, minecraft_version, mod_loader)',
      };
    }

    return {
      success: true,
      project: {
        ...project,
        id: undefined, // Let the system assign a new ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        build_count: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse project file: ${(error as Error).message}`,
    };
  }
};

/**
 * Validate project data
 */
export const validateProjectData = (projectData: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required fields
  if (!projectData.name) {
    errors.push('Project name is required');
  }

  if (!projectData.minecraft_version) {
    errors.push('Minecraft version is required');
  }

  if (!projectData.mod_loader) {
    errors.push('Mod loader is required');
  }

  if (!projectData.mod_version) {
    errors.push('Mod version is required');
  }

  // Validate version formats
  if (projectData.mod_version && !isValidVersion(projectData.mod_version)) {
    errors.push('Invalid mod version format (should be X.Y.Z)');
  }

  if (projectData.minecraft_version && !isValidVersion(projectData.minecraft_version)) {
    errors.push('Invalid Minecraft version format');
  }

  // Validate mod_loader
  const validLoaders = ['fabric', 'forge', 'neoforge'];
  if (projectData.mod_loader && !validLoaders.includes(projectData.mod_loader)) {
    errors.push(`Invalid mod loader. Must be one of: ${validLoaders.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check if version string is valid
 */
const isValidVersion = (version: string): boolean => {
  const versionRegex = /^\d+\.\d+(\.\d+)?$/;
  return versionRegex.test(version);
};

/**
 * Handle file input for import
 */
export const handleFileImport = async (file: File): Promise<ImportResult> => {
  try {
    // Check file type
    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        error: 'Invalid file type. Only .json files are supported.',
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File is too large. Maximum size is 10MB.',
      };
    }

    // Read file content
    const content = await file.text();

    // Import and validate
    const result = importProjectFromJSON(content);

    if (result.success && result.project) {
      const validation = validateProjectData(result.project);
      if (!validation.valid) {
        return {
          success: false,
          error: `Project validation failed: ${validation.errors.join(', ')}`,
        };
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to import file: ${(error as Error).message}`,
    };
  }
};

/**
 * Get project summary for export info
 */
export const getProjectSummary = (project: any) => {
  return {
    name: project.name,
    version: project.mod_version,
    minecraftVersion: project.minecraft_version,
    modLoader: project.mod_loader,
    author: project.author || 'Unknown',
    description: project.description || '',
    namespace: project.namespace || '',
    blocks: (project.blocks || []).length,
    items: (project.items || []).length,
    recipes: (project.recipes || []).length,
    entities: (project.entities || []).length,
    enchantments: (project.enchantments || []).length,
  };
};
