/**
 * @fileoverview System-file repair helpers for metadata extraction coverage.
 *
 * Keeps the large system_files repair logic isolated so the main coverage
 * repair module stays below watcher thresholds.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-files
 */

export {
  backfillSystemFileCalls,
  backfillSystemFileDefinitionsAndCulture,
  backfillSystemFileIdentifierRefs,
  backfillSystemFileSemanticAnalysis,
  backfillSystemFileTransitiveDependents,
  backfillSystemFileTransitiveDepends
} from './metadata-extraction-coverage-repair-system-files-backfill.js';
