/**
 * @fileoverview Canonical runtime/compiler metric snapshots backed by SQLite.
 *
 * @module shared/compiler/compiler-runtime-metrics
 */

export {
  getAtomCountSummary,
  getPhase2PendingFiles,
  getPhase2FileCounts
} from './compiler-runtime-metrics-db.js';

export {
  getGraphCoverageSummary,
  getMcpSessionSummary,
  getIssueSummary,
  getConceptualDuplicateSummary,
  getFileUniverseSummary,
  summarizeWatcherNoise
} from './compiler-runtime-metrics-summary.js';
