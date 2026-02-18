/**
 * @fileoverview file-query.js
 * 
 * @deprecated Use ./file-query/index.js directly
 * This file is a backward compatibility wrapper.
 * 
 * Migrate your imports from:
 *   import { getFileAnalysis } from './queries/file-query.js';
 * To:
 *   import { getFileAnalysis } from './queries/file-query/index.js';
 * 
 * @module query/queries/file-query (deprecated)
 */

// Re-export everything from the modular structure
export {
  getFileAnalysis,
  getMultipleFileAnalysis,
  getFileDependencies,
  getFileDependents,
  getFileAnalysisWithAtoms,
  getAtomDetails,
  findAtomsByArchetype
} from './file-query/index.js';
