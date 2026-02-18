/**
 * @fileoverview File query module - Public API
 * 
 * ARCHITECTURE: Layer C (Data Access Layer)
 * Abstracts storage details and provides unified interface to atomic/molecular data
 * 
 * @module query/queries/file-query
 * @phase Layer C (Data Access)
 * @dependencies storage-manager.js, derivation-engine.js
 */

// Core file queries
export { getFileAnalysis, getMultipleFileAnalysis } from './core/index.js';

// Dependency queries
export { getFileDependencies, getFileDependents } from './dependencies/index.js';

// Enriched analysis with atoms
export { getFileAnalysisWithAtoms } from './enriched/index.js';

// Atom-level queries
export { getAtomDetails, findAtomsByArchetype } from './atoms/index.js';
