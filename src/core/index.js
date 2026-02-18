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

// Graph (re-exportado desde layer-graph)
export * as graph from '#layer-graph/index.js';
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
} from '#layer-graph/index.js';

// Storage (re-exportado desde layer-c-memory)
export * as storage from '#layer-c/storage/index.js';
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
} from '#layer-c/storage/index.js';

// Default export
export { AnalysisWorker as default } from './worker/AnalysisWorker.js';
