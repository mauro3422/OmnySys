/**
 * @fileoverview Prompt Registry Module
 * 
 * Sistema modular de registro de arquetipos.
 * 
 * @module prompt-registry
 * @version 2.0.0
 */

// Data
export { ARCHETYPE_REGISTRY } from './registry-data.js';

// Detectors
export {
  detectGodObjectArchetype, detectOrphanModuleArchetype, detectSingleton,
  detectFacade, detectConfigHub, detectEntryPoint
} from './detectors/structural-detectors.js';

export {
  detectDynamicImporter, detectEventHub, detectGlobalState, detectStateManager,
  detectNetworkHub, detectApiEventBridge, detectStorageSyncManager
} from './detectors/behavioral-detectors.js';

export { detectCriticalBottleneck } from './detectors/performance-detectors.js';

// Queries
export {
  getArchetype, detectArchetypes, selectArchetypeBySeverity, getTemplateForType,
  getMergeConfig, listAvailableArchetypes, filterArchetypesRequiringLLM, archetypeRequiresLLM
} from './queries/archetype-queries.js';
