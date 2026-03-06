/**
 * @fileoverview Canonical entrypoint for keeping support tables aligned with
 * the live atom-backed file graph.
 *
 * @module shared/compiler/live-row-sync
 */

import { buildLiveRowReconciliationPlan } from './live-row-reconciliation.js';
import { executeLiveRowCleanup } from './live-row-cleanup.js';

function summarizeDeleted(result = {}) {
  const deletedFiles = Number(result?.deleted?.files || 0);
  const deletedRiskAssessments = Number(result?.deleted?.riskAssessments || 0);

  return {
    files: deletedFiles,
    riskAssessments: deletedRiskAssessments,
    total: deletedFiles + deletedRiskAssessments
  };
}

export function ensureLiveRowSync(db, options = {}) {
  const {
    autoSync = true,
    sampleLimit = 5
  } = options;

  const before = buildLiveRowReconciliationPlan(db, { sampleLimit });
  const hasDrift = (before.summary?.staleFileRows || 0) > 0 || (before.summary?.staleRiskRows || 0) > 0;

  let cleanup = {
    dryRun: true,
    deleted: {
      files: 0,
      riskAssessments: 0
    }
  };
  let cleanupError = null;

  if (autoSync && hasDrift) {
    try {
      const transaction = db.transaction(() => executeLiveRowCleanup(db, { dryRun: false, sampleLimit }));
      cleanup = transaction();
    } catch (error) {
      cleanupError = {
        message: error?.message || 'Live-row synchronization failed',
        code: error?.code || 'LIVE_ROW_SYNC_FAILED'
      };
    }
  }

  const after = buildLiveRowReconciliationPlan(db, { sampleLimit });
  const deleted = summarizeDeleted(cleanup);

  return {
    autoSync,
    hadDrift: hasDrift,
    synchronized: deleted.total > 0 && !cleanupError,
    cleanupError,
    deleted,
    before,
    after,
    summary: after.summary
  };
}
