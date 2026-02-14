/**
 * @fileoverview Atomic/Molecular Tools (Legacy Entry Point)
 * 
 * @deprecated Use ./atomic/atomic-tools.js directly
 * 
 * This file re-exports from the modular structure for backward compatibility.
 * 
 * @module unified-server/tools/atomic-tools
 * @version 0.9.4 - Modularizado
 */

// Re-export from modular structure
export {
  getFunctionDetails,
  getMoleculeSummary,
  analyzeFunctionChange,
  getAtomicFunctions
} from './atomic/atomic-tools.js';

// Re-export helpers and formatters
export {
  getRiskReason,
  getRiskLevel,
  calculateRiskMetrics
} from './atomic/helpers/index.js';

export {
  getRecommendation,
  getAllRecommendations,
  getTestingRecommendations
} from './atomic/recommendations/index.js';

export {
  formatAtomBasic,
  formatSideEffects,
  formatCallGraph,
  formatQualityMetrics,
  formatFunctionSummary,
  formatInsights
} from './atomic/formatters/index.js';

// Default export
export { default } from './atomic/atomic-tools.js';
