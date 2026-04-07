/**
 * @fileoverview Thin barrel — delegates to compiler-health-archive/index.js
 */
export {
  getCompilerHealthArchiveDb,
  closeCompilerHealthArchiveDb,
  shutdownCompilerHealthArchiveStorage,
  persistCompilerHealthArchiveSnapshot,
  persistCompilerMetricsArchiveSnapshot,
  loadCompilerHealthArchiveHistory,
  loadCompilerHealthArchiveSummary,
  loadCompilerMetricsArchiveHistory
} from './compiler-health-archive/index.js';

export { default } from './compiler-health-archive/index.js';
