/**
 * @fileoverview Canonical runtime/compiler metric snapshots backed by SQLite.
 *
 * @module shared/compiler/compiler-runtime-metrics
 */

export {
  getAtomCountSummary,
  getPhase2PendingFiles,
  getPhase2FileCounts
} from '../compiler-runtime-metrics-db.js';

export {
  buildCompilerMetricsSnapshot,
  summarizeCompilerMetricsSnapshot
} from '../compiler-metrics-snapshot.js';

export {
  getGraphCoverageSummary,
  getMcpSessionSummary,
  getIssueSummary,
  getConceptualDuplicateSummary,
  getFileUniverseSummary,
  summarizeWatcherNoise
} from './summary.js';

