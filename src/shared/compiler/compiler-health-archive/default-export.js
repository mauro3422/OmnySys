import {
  getCompilerHealthArchiveDb,
  closeCompilerHealthArchiveDb,
  shutdownCompilerHealthArchiveStorage
} from './connection-manager.js';
import {
  persistCompilerHealthArchiveSnapshot,
  persistCompilerMetricsArchiveSnapshot
} from './persistence.js';
import {
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary
} from './health-history.js';
import {
  loadCompilerMetricsArchiveHistory
} from './metrics-history.js';

export default {
  getCompilerHealthArchiveDb,
  closeCompilerHealthArchiveDb,
  shutdownCompilerHealthArchiveStorage,
  persistCompilerHealthArchiveSnapshot,
  persistCompilerMetricsArchiveSnapshot,
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary,
  loadCompilerMetricsArchiveHistory
};
