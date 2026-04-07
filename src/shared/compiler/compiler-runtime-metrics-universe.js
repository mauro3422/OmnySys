/**
 * @fileoverview File-universe runtime/compiler metrics helpers.
 *
 * @module shared/compiler/compiler-runtime-metrics-universe
 */

import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { getLiveFileTotal } from './live-row-utils.js';
import { ensureLiveRowSync } from './live-row-reconciliation.js';

export function collectFileUniverseMetrics(db) {
  if (!db) {
    return {
      scannedFileTotal: 0,
      manifestFileTotal: 0,
      liveFileCount: 0,
      zeroAtomFileCount: 0,
      liveCoverageRatio: 0,
      contract: null
    };
  }

  const manifestFileTotal = db.prepare('SELECT COUNT(*) as n FROM compiler_scanned_files').get()?.n || 0;
  const liveFileCount = getLiveFileTotal(db);

  const summary = getFileUniverseGranularity({
    scannedFileTotal: liveFileCount || manifestFileTotal,
    manifestFileTotal,
    liveFileCount
  });

  return {
    scannedFileTotal: summary?.scannedFileTotal || 0,
    manifestFileTotal: summary?.manifestFileTotal || 0,
    liveFileCount: summary?.liveFileCount || 0,
    zeroAtomFileCount: summary?.zeroAtomFileCount || 0,
    liveCoverageRatio: summary?.liveCoverageRatio || 0,
    contract: summary?.contract || null
  };
}
