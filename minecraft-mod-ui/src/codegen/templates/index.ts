/**
 * Template System Index
 * Routes to the correct mod loader templates based on project configuration
 */

export * from './types';

// Fabric templates
export {
  generateFabricModMain,
  generateFabricBlock,
  generateFabricItem,
  generateFabricEntity,
  generateFabricRecipe,
  generateFabricConfig,
} from './fabric';

// Forge templates
export {
  generateForgeModMain,
  generateForgeBlock,
  generateForgeItem,
  generateForgeEntity,
  generateForgeConfig,
} from './forge';

// NeoForge templates
export {
  generateNeoForgeModMain,
  generateNeoForgeBlock,
  generateNeoForgeItem,
  generateNeoForgeEntity,
  generateNeoForgeConfig,
} from './neoforge';
