/**
 * @fileoverview Compiler Health Archive — barrel module
 * Re-exports connection, persistence, and history modules.
 */

export {
  getCompilerHealthArchiveDb,
  closeCompilerHealthArchiveDb,
  shutdownCompilerHealthArchiveStorage
} from './connection-manager.js';

export {
  persistCompilerHealthArchiveSnapshot,
  persistCompilerMetricsArchiveSnapshot
} from './persistence.js';

export {
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary
} from './health-history.js';

export {
  loadCompilerHealthArchiveSummary as loadCompilerHealthArchiveDailySummary
} from './health-history-summary.js';

export {
  loadCompilerMetricsArchiveHistory
} from './metrics-history.js';

export { default } from './default-export.js';
