/**
 * @fileoverview High-level live-row reconciliation and remediation entrypoints.
 *
 * @module shared/compiler/live-row-reconciliation
 */

import { countLiveRowDeletes, hasLiveRowDrift, runLiveRowCleanup } from './live-row-sync-helpers.js';
import { getPhase2PendingFiles } from './compiler-runtime-metrics.js';
import {
  buildLiveRowCleanupPlan,
  buildLiveRowReconciliationPlan,
  buildLiveRowRemediationPlan,
  executeLiveRowCleanup
} from './live-row-reconciliation-plan.js';

export {
  buildLiveRowReconciliationPlan,
  buildLiveRowCleanupPlan,
  buildLiveRowRemediationPlan,
  executeLiveRowCleanup
};

export function ensureLiveRowSync(db, options = {}) {
  const { autoSync = true, sampleLimit = 5 } = options;
  const phase2PendingFiles = getPhase2PendingFiles(db);
  const before = buildLiveRowReconciliationPlan(db, { sampleLimit });
  const cleanupOutcome = runLiveRowCleanup(db, before, { autoSync, sampleLimit }, executeLiveRowCleanup);
  const after = buildLiveRowReconciliationPlan(db, { sampleLimit });

  return {
    autoSync,
    phase2PendingFiles,
    hadDrift: hasLiveRowDrift(before?.summary),
    deferred: Boolean(cleanupOutcome.cleanup?.skipped),
    skipped: Boolean(cleanupOutcome.cleanup?.skipped),
    skippedReason: cleanupOutcome.cleanup?.skippedReason || null,
    synchronized: countLiveRowDeletes(cleanupOutcome.cleanup?.deleted) > 0 && !cleanupOutcome.cleanupError,
    cleanupError: cleanupOutcome.cleanupError,
    deleted: cleanupOutcome.cleanup?.deleted || { atoms: 0, files: 0, riskAssessments: 0, relations: 0, issues: 0, connections: 0 },
    before,
    after,
    summary: after.summary
  };
}
