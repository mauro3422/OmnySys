/**
 * @fileoverview Live-row synchronization wrapper for database health.
 *
 * Keeps the public database-health summary focused on orchestration while
 * this helper owns the reconcile-before-score path.
 *
 * @module shared/compiler/database-health-live-row-sync
 */

import { ensureLiveRowSync } from './live-row-reconciliation.js';

export function resolveDatabaseHealthLiveRowSync(db, options = {}) {
  const {
    autoSyncLiveRows = true,
    liveRowSyncSampleLimit = 5
  } = options || {};

  if (!autoSyncLiveRows) {
    return null;
  }

  try {
    return ensureLiveRowSync(db, { autoSync: true, sampleLimit: liveRowSyncSampleLimit });
  } catch (error) {
    return {
      autoSync: true,
      hadDrift: false,
      synchronized: false,
      cleanupError: error,
      deleted: { atoms: 0, files: 0, riskAssessments: 0, relations: 0, connections: 0 },
      before: null,
      after: null,
      summary: {
        liveFileTotal: 0,
        staleAtomRows: 0,
        staleFileRows: 0,
        staleRiskRows: 0,
        staleRelationRows: 0,
        staleConnectionRows: 0
      }
    };
  }
}
