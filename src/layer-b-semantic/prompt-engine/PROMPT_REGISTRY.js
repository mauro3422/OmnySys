/**
 * @fileoverview Prompt Registry (Legacy Compatibility)
 * 
 * @deprecated Use './prompt-registry/index.js' instead
 * @module prompt-registry-legacy
 * @version 2.0.0
 */

import { validateRegistry } from './registry-validator.js';
import { createLogger } from '../../utils/logger.js';
import { ARCHETYPE_REGISTRY } from './prompt-registry/registry-data.js';
import {
  getArchetype, detectArchetypes, selectArchetypeBySeverity, getTemplateForType,
  getMergeConfig, listAvailableArchetypes, filterArchetypesRequiringLLM, archetypeRequiresLLM
} from './prompt-registry/queries/archetype-queries.js';

// Re-export everything for backward compatibility
export {
  ARCHETYPE_REGISTRY,
  getArchetype,
  detectArchetypes,
  selectArchetypeBySeverity,
  getTemplateForType,
  getMergeConfig,
  listAvailableArchetypes,
  filterArchetypesRequiringLLM,
  archetypeRequiresLLM
};

export default {
  ARCHETYPE_REGISTRY,
  getArchetype,
  detectArchetypes,
  selectArchetypeBySeverity,
  getTemplateForType,
  getMergeConfig,
  listAvailableArchetypes,
  filterArchetypesRequiringLLM,
  archetypeRequiresLLM
};

// Validation
const logger = createLogger('OmnySys:PROMPT:REGISTRY');
const registryValidation = validateRegistry(ARCHETYPE_REGISTRY);

if (!registryValidation.valid) {
  logger.warn('ARCHETYPE_REGISTRY validation issues:');
  for (const issue of registryValidation.issues) {
    logger.warn(`  - ${issue}`);
  }
}
