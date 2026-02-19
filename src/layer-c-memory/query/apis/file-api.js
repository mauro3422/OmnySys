/**
 * @fileoverview File API
 *
 * API especializada para análisis de archivos individuales
 * Consultas de átomos, dependencias y metadatos
 *
 * @module query/apis/file-api
 * @version 1.0.0
 * @since 2026-02-11
 */

export {
  getFileAnalysis,
  getMultipleFileAnalysis,
  getFileDependencies,
  getFileDependents,
  getFileAnalysisWithAtoms,
  getAtomDetails,
  findAtomsByArchetype
} from '../queries/file-query/index.js';

// Re-exports de readers (comúnmente usados juntos con file queries)
export { readJSON, readMultipleJSON, fileExists } from '../readers/json-reader.js';
