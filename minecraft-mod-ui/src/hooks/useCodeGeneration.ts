/**
 * useCodeGeneration Hook
 * Provides code generation capabilities to editor components.
 * 
 * Features:
 * - Generate code for single content items (preview in editors)
 * - Generate full mod code (export functionality)
 * - Access to knowledge base patterns
 * - Learning new patterns from user
 */

import { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore';
import {
  ModCodeGenerator,
  generateSingleBlock,
  generateSingleItem,
  generateSingleEntity,
  generateSingleRecipe,
  KnowledgeBase,
  type GenerationResult,
  type GenerationOptions,
} from '../codegen';
import type { GeneratedFile, LearnedPattern, ModLoader, MinecraftVersion, ContentType } from '../codegen/templates/types';
import type { Block, Item, EntityType, Recipe } from '../types';

// ============================================================
// TYPES
// ============================================================

interface CodeGenState {
  isGenerating: boolean;
  lastResult: GenerationResult | null;
  previewFiles: GeneratedFile[];
  error: string | null;
}

interface KnowledgeState {
  isLoading: boolean;
  patterns: LearnedPattern[];
  error: string | null;
}

// ============================================================
// MAIN HOOK: useCodeGeneration
// ============================================================

/**
 * Primary hook for code generation in editors.
 * Provides preview generation, full mod generation, and pattern learning.
 */
export function useCodeGeneration() {
  const { currentProject, blocks, items, recipes, entities } = useProjectStore();

  const [state, setState] = useState<CodeGenState>({
    isGenerating: false,
    lastResult: null,
    previewFiles: [],
    error: null,
  });

  /**
   * Generate code preview for a single block
   */
  const previewBlock = useCallback((block: Block): GeneratedFile[] => {
    if (!currentProject) return [];
    try {
      const files = generateSingleBlock(currentProject, block);
      setState(prev => ({ ...prev, previewFiles: files, error: null }));
      return files;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Generation failed';
      setState(prev => ({ ...prev, error }));
      return [];
    }
  }, [currentProject]);

  /**
   * Generate code preview for a single item
   */
  const previewItem = useCallback((item: Item): GeneratedFile[] => {
    if (!currentProject) return [];
    try {
      const files = generateSingleItem(currentProject, item);
      setState(prev => ({ ...prev, previewFiles: files, error: null }));
      return files;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Generation failed';
      setState(prev => ({ ...prev, error }));
      return [];
    }
  }, [currentProject]);

  /**
   * Generate code preview for a single entity
   */
  const previewEntity = useCallback((entity: EntityType): GeneratedFile[] => {
    if (!currentProject) return [];
    try {
      const files = generateSingleEntity(currentProject, entity);
      setState(prev => ({ ...prev, previewFiles: files, error: null }));
      return files;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Generation failed';
      setState(prev => ({ ...prev, error }));
      return [];
    }
  }, [currentProject]);

  /**
   * Generate code preview for a single recipe
   */
  const previewRecipe = useCallback((recipe: Recipe): GeneratedFile[] => {
    if (!currentProject) return [];
    try {
      const files = generateSingleRecipe(currentProject, recipe, items, blocks);
      setState(prev => ({ ...prev, previewFiles: files, error: null }));
      return files;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Generation failed';
      setState(prev => ({ ...prev, error }));
      return [];
    }
  }, [currentProject, items, blocks]);

  /**
   * Generate complete mod code for the entire project
   */
  const generateFullMod = useCallback(async (options?: GenerationOptions): Promise<GenerationResult | null> => {
    if (!currentProject) {
      setState(prev => ({ ...prev, error: 'No project selected' }));
      return null;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const generator = new ModCodeGenerator(currentProject);
      const result = await generator.generateFullMod(
        blocks, items, [], recipes, entities, options
      );

      setState({
        isGenerating: false,
        lastResult: result,
        previewFiles: result.files,
        error: result.success ? null : result.errors.join('; '),
      });

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Full generation failed';
      setState(prev => ({ ...prev, isGenerating: false, error }));
      return null;
    }
  }, [currentProject, blocks, items, recipes, entities]);

  /**
   * Clear the current preview
   */
  const clearPreview = useCallback(() => {
    setState({ isGenerating: false, lastResult: null, previewFiles: [], error: null });
  }, []);

  /**
   * Get project info for display
   */
  const projectInfo = useMemo(() => {
    if (!currentProject) return null;
    return {
      name: currentProject.name,
      loader: currentProject.mod_loader,
      version: currentProject.minecraft_version,
      namespace: currentProject.namespace,
      contentCount: {
        blocks: blocks.length,
        items: items.length,
        recipes: recipes.length,
        entities: entities.length,
      },
    };
  }, [currentProject, blocks, items, recipes, entities]);

  return {
    // State
    ...state,
    projectInfo,

    // Preview generators
    previewBlock,
    previewItem,
    previewEntity,
    previewRecipe,
    clearPreview,

    // Full generation
    generateFullMod,
  };
}

// ============================================================
// KNOWLEDGE BASE HOOK: useKnowledge
// ============================================================

/**
 * Hook for accessing and managing the code knowledge base.
 * Used for learning patterns, browsing patterns, and version migration info.
 */
export function useKnowledge() {
  const [state, setState] = useState<KnowledgeState>({
    isLoading: false,
    patterns: [],
    error: null,
  });

  /**
   * Initialize knowledge base
   */
  const init = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await KnowledgeBase.init();
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to init knowledge base',
      }));
    }
  }, []);

  /**
   * Load patterns for a specific loader + version + content type
   */
  const loadPatterns = useCallback(async (
    modLoader: ModLoader,
    minecraftVersion: MinecraftVersion,
    contentType?: ContentType
  ) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await KnowledgeBase.init();
      let patterns: LearnedPattern[];
      if (contentType) {
        patterns = await KnowledgeBase.patterns.get(modLoader, minecraftVersion, contentType);
      } else {
        patterns = await KnowledgeBase.getProjectPatterns(modLoader, minecraftVersion);
      }
      setState({ isLoading: false, patterns, error: null });
      return patterns;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load patterns',
      }));
      return [];
    }
  }, []);

  /**
   * Search patterns by query
   */
  const searchPatterns = useCallback(async (query: string, modLoader?: ModLoader) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await KnowledgeBase.init();
      const patterns = await KnowledgeBase.patterns.search(query, modLoader);
      setState({ isLoading: false, patterns, error: null });
      return patterns;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Search failed',
      }));
      return [];
    }
  }, []);

  /**
   * Learn a new pattern from user code
   */
  const learnPattern = useCallback(async (
    modLoader: ModLoader,
    minecraftVersion: MinecraftVersion,
    contentType: ContentType,
    patternName: string,
    description: string,
    codeSnippet: string,
    imports: string[] = [],
    tags: string[] = []
  ): Promise<number | null> => {
    try {
      await KnowledgeBase.init();
      const id = await KnowledgeBase.learnFromCode(
        modLoader, minecraftVersion, contentType,
        patternName, description, codeSnippet, imports, tags
      );
      return id;
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to learn pattern',
      }));
      return null;
    }
  }, []);

  /**
   * Get version migration info
   */
  const getVersionChanges = useCallback(async (
    modLoader: ModLoader,
    fromVersion: MinecraftVersion,
    toVersion: MinecraftVersion
  ) => {
    try {
      await KnowledgeBase.init();
      return await KnowledgeBase.getVersionChanges(modLoader, fromVersion, toVersion);
    } catch {
      return [];
    }
  }, []);

  /**
   * Get most frequently used patterns
   */
  const getMostUsed = useCallback(async (limit = 10) => {
    try {
      await KnowledgeBase.init();
      const patterns = await KnowledgeBase.patterns.getMostUsed(limit);
      setState(prev => ({ ...prev, patterns }));
      return patterns;
    } catch {
      return [];
    }
  }, []);

  /**
   * Get user-defined patterns
   */
  const getUserPatterns = useCallback(async () => {
    try {
      await KnowledgeBase.init();
      const patterns = await KnowledgeBase.patterns.getUserPatterns();
      setState(prev => ({ ...prev, patterns }));
      return patterns;
    } catch {
      return [];
    }
  }, []);

  /**
   * Reset knowledge base (re-seed from scratch)
   */
  const resetKnowledge = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await KnowledgeBase.reset();
      setState({ isLoading: false, patterns: [], error: null });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Reset failed',
      }));
    }
  }, []);

  return {
    ...state,
    init,
    loadPatterns,
    searchPatterns,
    learnPattern,
    getVersionChanges,
    getMostUsed,
    getUserPatterns,
    resetKnowledge,
  };
}

// ============================================================
// UTILITY HOOK: useFileDownload
// ============================================================

/**
 * Hook for downloading generated files as a zip or individual files.
 */
export function useFileDownload() {
  /**
   * Download a single generated file
   */
  const downloadFile = useCallback((file: GeneratedFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Download all generated files as a concatenated text (for preview)
   * In production, this would create a ZIP file
   */
  const downloadAllAsText = useCallback((files: GeneratedFile[], projectName: string) => {
    const content = files.map(f =>
      `// ============================================================\n` +
      `// FILE: ${f.path}\n` +
      `// ${f.description}\n` +
      `// ============================================================\n\n` +
      f.content + '\n\n'
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-generated-code.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Copy file content to clipboard
   */
  const copyToClipboard = useCallback(async (content: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }, []);

  return {
    downloadFile,
    downloadAllAsText,
    copyToClipboard,
  };
}
