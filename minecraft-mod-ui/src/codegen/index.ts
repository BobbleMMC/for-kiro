/**
 * Code Generation Module
 * Central export for the entire code generation system
 */

// Main generator
export {
  ModCodeGenerator,
  generateSingleBlock,
  generateSingleItem,
  generateSingleEntity,
  generateSingleRecipe,
  type GenerationResult,
  type GenerationOptions,
} from './ModCodeGenerator';

// Knowledge base
export {
  KnowledgeBase,
  PatternStore,
  VersionDiffStore,
  RegistrationStore,
  seedKnowledgeBase,
} from './knowledgeBase';

// Templates
export * from './templates';
