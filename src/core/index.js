/**
 * @fileoverview index.js
 * 
 * Main entry point for core module.
 * 
 * @module core
 */

// Worker
export { AnalysisWorker } from './worker/AnalysisWorker.js';
export { WorkerState } from './worker/WorkerState.js';

// Jobs
export { JobAnalyzer } from './jobs/JobAnalyzer.js';

// Graph
export * as graph from './graph/index.js';
export {
  buildSystemMap,
  buildSystemMap as buildGraph,
  getImpactMap,
  createEmptySystemMap,
  createFileNode,
  createDependency,
  createFunctionLink,
  createImpactInfo,
  buildExportIndex,
  buildFunctionLinks,
  detectCycles,
  calculateTransitiveDependencies,
  calculateTransitiveDependents,
  calculateRiskLevel,
  generateRecommendation,
  findHighImpactFiles,
  RISK_LEVELS
} from './graph/index.js';

// Storage
export * as storage from './storage/index.js';
export {
  calculateFileHash,
  createDataDirectory,
  getDataDirectory,
  hasExistingAnalysis,
  saveMetadata,
  saveFileAnalysis,
  saveConnections,
  saveRiskAssessment,
  savePartitionedSystemMap,
  saveMolecule,
  loadMolecule,
  saveAtom,
  loadAtoms
} from './storage/index.js';

// Default export
export { AnalysisWorker as default } from './worker/AnalysisWorker.js';
