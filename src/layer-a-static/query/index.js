/**
 * @fileoverview index.js
 * 
 * Facade del servicio de consultas
 * 
 * @module query
 */

// Readers
export { readJSON, readMultipleJSON, fileExists } from './readers/json-reader.js';

// Queries
export {
  getProjectMetadata,
  getAnalyzedFiles,
  getProjectStats,
  findFiles
} from './queries/project-query.js';

export {
  getFileAnalysis,
  getMultipleFileAnalysis,
  getFileDependencies,
  getFileDependents
} from './queries/file-query.js';

export {
  getDependencyGraph,
  getTransitiveDependents
} from './queries/dependency-query.js';

export {
  getAllConnections
} from './queries/connections-query.js';

export {
  getRiskAssessment
} from './queries/risk-query.js';

export {
  exportFullSystemMapToFile
} from './export.js';
