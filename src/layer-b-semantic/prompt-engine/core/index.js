/**
 * @fileoverview Prompt Engine Core - Index
 * 
 * Componentes core del motor de prompts.
 * 
 * @module prompt-engine/core
 * @version 1.0.0
 */

export { PromptEngine } from './prompt-engine.js';
export {
  generateSystemPrompt,
  generateUserPrompt,
  generatePromptConfig,
  generatePromptWithOptions,
  PromptGenerationOptions
} from './prompt-generator.js';

export {
  resolveSchema,
  getSchemaSync,
  preloadSchemas,
  hasSchema,
  listAvailableSchemas
} from './schema-resolver.js';

// Constantes
export const ENGINE_DEFAULT_CONFIG = {
  temperature: 0.0,
  maxTokens: 2000,
  enableCompacting: true,
  validatePrompts: true,
  throwOnValidationError: false
};
