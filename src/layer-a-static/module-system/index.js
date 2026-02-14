/**
 * @fileoverview Module System - Entry Point Fase 3
 * 
 * Orquesta el análisis a nivel módulo y sistema.
 * 
 * @module module-system/index
 * @version 3.0.0
 * @phase 3
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

// === Orchestrators ===
export { 
  analyzeModules,
  analyzeSingleModule,
  analyzeSystemOnly
} from './orchestrators/index.js';

// === Groupers ===
export { 
  groupMoleculesByModule,
  extractModuleName,
  getModulePathForFile
} from './groupers/index.js';

// === Enrichers ===
export { 
  enrichMoleculesWithSystemContext,
  createEmptyContext
} from './enrichers/index.js';

// === Queries ===
export { 
  queryImpact,
  calculateImpactRisk,
  summarizeImpact,
  queryDataFlow,
  listDataFlows,
  findFlowsByModule,
  findFlowsByFunction
} from './queries/index.js';

// === Legacy Exports (backward compatibility) ===
// Re-exportamos los existentes
export { ModuleAnalyzer } from './module-analyzer/ModuleAnalyzer.js';
export { SystemAnalyzer } from './system-analyzer.js';

// === Default Export ===
import { analyzeModules } from './orchestrators/index.js';
import { enrichMoleculesWithSystemContext } from './enrichers/index.js';
import { queryImpact, queryDataFlow } from './queries/index.js';

export default {
  analyzeModules,
  enrichMoleculesWithSystemContext,
  queryImpact,
  queryDataFlow
};
