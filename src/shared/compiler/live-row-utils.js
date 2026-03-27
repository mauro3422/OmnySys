/**
 * @fileoverview Canonical helpers for reconciling live atom-backed files
 * against persisted support tables (files, risk_assessments, etc.).
 *
 * @module shared/compiler/live-row-utils
 */

export {
  getLiveFileSetSql,
  getLiveFileTotal,
  getStaleTableRowCount,
  getStaleAtomRowCount,
  getLiveRowDriftSummary,
  loadStaleTableRows
} from './live-row-utils-queries.js';

export {
  detectLiveRowDrift
} from './live-row-utils-detection.js';
