/**
 * @fileoverview Prompt Engine - Single Source of Truth (SSoT)
 *
 * Sistema centralizado para gestion de prompts dinamicos basados en metadatos.
 * No permite que llm-analyzer.js crezca, todo el prompting esta centralizado aqui.
 *
 * ARCHITECTURE: Layer B (Prompt Construction) → Layer C (LLM Communication)
 * Bridges static analysis with LLM by creating targeted prompts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REFACTOR v2.0: Dividido en módulos especializados
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Structure:
 *   - config/     : Reglas anti-hallucination y placeholders
 *   - core/       : Generadores y resolutores
 *   - validators/ : Validación de prompts
 *   - utils/      : Utilidades de reemplazo y formateo
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Prompt Types and Templates
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new type of LLM analysis with custom prompting:
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 1: Create Prompt Template
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Create file in: src/layer-b-semantic/prompt-engine/prompt-templates/
 *
 *     // your-analysis-type.js
 *     export const yourAnalysisTypeTemplate = {
 *       name: 'your-analysis-type',
 *       
 *       // When to use this template (based on metadata)
 *       detect: (metadata) => {
 *         // Return true if this template applies
 *         return metadata.hasYourSpecificPattern === true;
 *       },
 *       
 *       // Priority (higher = checked first)
 *       priority: 50,
 *       
 *       // Prompt sections
 *       sections: {
 *         context: `...`,
 *         instructions: `...`,
 *         outputFormat: `...`
 *       },
 *       
 *       // JSON Schema for response validation
 *       responseSchema: { ... }
 *     };
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 2: Register in PROMPT_REGISTRY.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Add to: src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js
 *
 *     import { yourAnalysisTypeTemplate } from './prompt-templates/your-analysis-type.js';
 *     export const PROMPT_REGISTRY = {
 *       // ... existing templates ...
 *       'your-analysis-type': yourAnalysisTypeTemplate,
 *     };
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 3: Add Anti-Hallucination Rules (optional)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In: src/layer-b-semantic/prompt-engine/config/anti-hallucination-rules.js
 *
 *     export const SPECIFIC_RULES = {
 *       // ... existing rules ...
 *       'your-analysis-type': `
 * YOUR RULES:
 * - Specific rule 1
 * - Specific rule 2
 *       `
 *     };
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  PRINCIPLES TO MAINTAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ SSOT: This is the ONLY place that defines prompts
 * ✓ Anti-hallucination: Every prompt must include anti-hallucination rules
 * ✓ JSON Schema: Every template MUST define responseSchema
 * ✓ Temperature 0.0: Always use 0.0 for deterministic extraction
 * ✓ Declarative templates: Keep logic in 'detect' function
 *
 * 🔗  RELATED FILES:
 *     - PROMPT_REGISTRY.js: Central registry of all templates
 *     - prompt-selector.js: Chooses which template to use
 *     - prompt-templates/*.js: Individual template definitions
 *     - core/: Engine components
 *     - config/: Rules and registries
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGLA: Los schemas deben corresponder SOLO a analysis types activos en 
 * PROMPT_REGISTRY.js. Si un arquetipo se elimina, su schema tambien.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS LEGACY - Backwards Compatibility
// ═══════════════════════════════════════════════════════════════════════════════

import { PromptEngine } from './core/prompt-engine.js';

// Export singleton instance (legacy compatibility)
const defaultEngine = new PromptEngine();
export default defaultEngine;

// Export class for custom instances
export { PromptEngine };

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS CORE - New modular architecture
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core config
  ENGINE_DEFAULT_CONFIG,
  
  // Generators
  generateSystemPrompt,
  generateUserPrompt,
  generatePromptConfig,
  generatePromptWithOptions,
  PromptGenerationOptions,
  
  // Schema Resolver
  resolveSchema,
  getSchemaSync,
  preloadSchemas,
  hasSchema,
  listAvailableSchemas
} from './core/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS CONFIG - Rules and registries
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Anti-hallucination
  BASE_RULES,
  SPECIFIC_RULES,
  getRulesForType,
  hasSpecificRules,
  getSupportedAnalysisTypes,
  
  // Placeholders
  PLACEHOLDER_DEFINITIONS,
  getAllPlaceholders,
  extractRequiredPlaceholders,
  resolvePlaceholder,
  isValidPlaceholder,
  listAvailablePlaceholders,
  
  // Config
  DEFAULT_ENGINE_CONFIG
} from './config/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS VALIDATORS - Prompt validation
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ValidationResult,
  validatePrompt,
  validateTemplate,
  validatePromptOrThrow
} from './validators/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS UTILS - Helper functions
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Placeholder replacer
  extractPlaceholders,
  replacePlaceholder,
  replaceAllPlaceholders,
  createReplacementMap,
  applyReplacements,
  
  // Metadata formatter
  compactBlock,
  compactMetadataSection,
  insertFileContent,
  formatMetadataForDisplay
} from './utils/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const VERSION = '2.0.0';
export const REFACTOR_DATE = '2026-02-13';
