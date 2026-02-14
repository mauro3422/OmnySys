/**
 * @fileoverview Prompt Engine Config - Index
 * 
 * Configuración central del motor de prompts.
 * 
 * @module prompt-engine/config
 * @version 1.0.0
 */

// Anti-hallucination rules
export {
  BASE_RULES,
  SPECIFIC_RULES,
  getRulesForType,
  hasSpecificRules,
  getSupportedAnalysisTypes
} from './anti-hallucination-rules.js';

// Placeholder registry
export {
  PLACEHOLDER_DEFINITIONS,
  getAllPlaceholders,
  extractRequiredPlaceholders,
  resolvePlaceholder,
  isValidPlaceholder,
  listAvailablePlaceholders
} from './placeholder-registry.js';

// Default engine configuration
export const DEFAULT_ENGINE_CONFIG = {
  temperature: 0.0,
  maxTokens: 2000,
  enableCompacting: true,
  validatePrompts: true
};
