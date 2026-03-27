/**
 * @fileoverview Link-oriented system-file repair helpers.
 *
 * Keeps semantic analysis and transitive dependency backfills isolated from
 * the main system-file repair module so both files stay below watcher size
 * thresholds.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-file-links
 */

export {
  backfillSystemFileSemanticAnalysis
} from './metadata-extraction-coverage-repair-system-file-links-semantic.js';

export {
  backfillSystemFileTransitiveDependents,
  backfillSystemFileTransitiveDepends
} from './metadata-extraction-coverage-repair-system-file-links-dependencies.js';
