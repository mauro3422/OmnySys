/**
 * @fileoverview Canonical compiler persistence helpers.
 *
 * Bridges filesystem-backed metadata and SQLite-backed compiler state so
 * runtime consumers stop open-coding fs + repository logic inline.
 *
 * @module shared/compiler/compiler-persistence
 */

export {
  hasPersistedCompilerAnalysis
} from './compiler-persistence-analysis.js';

export {
  getPersistedScannedFilePaths,
  loadPersistedScannedFilePaths,
  syncPersistedScannedFileManifest,
  summarizePersistedScannedFileCoverage
} from './compiler-persistence-manifest.js';

export {
  getPersistedIndexedFilePaths,
  getPersistedKnownFilePaths,
  findIndexedFileCandidate
} from './compiler-persistence-lookup.js';

export {
  cleanupOrphanedCompilerArtifacts,
  emitOrphanedImportsFromPersistedMetadata,
  reconcileExcludedCompilerFiles,
  removePersistedAtomMetadata,
  removePersistedFileMetadata
} from './compiler-persistence-cleanup.js';
