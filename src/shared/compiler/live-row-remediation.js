/**
 * @fileoverview Canonical remediation helpers for stale support-table rows
 * that no longer map to the live atom-backed file graph.
 *
 * @module shared/compiler/live-row-remediation
 */

import { buildLiveRowReconciliationPlan } from './live-row-reconciliation.js';
import { buildStandardPlan } from './remediation-plan-builder.js';

export function buildLiveRowRemediationPlan(db, options = {}) {
  const reconciliationPlan = buildLiveRowReconciliationPlan(db, options);
  const {
    liveFileTotal = 0,
    staleFileRows = 0,
    staleRiskRows = 0
  } = reconciliationPlan.summary || {};

  const severity = (staleFileRows + staleRiskRows) > 0 ? 'warning' : 'ok';

  return buildStandardPlan({
    total: staleFileRows + staleRiskRows,
    items: [], // Reconciliation plan returns samples directly
    recommendation: 'Reconcile support tables with the live atom graph.',
    severity,
    summary: reconciliationPlan.summary,
    staleFileSamples: reconciliationPlan.staleFileSamples,
    staleRiskSamples: reconciliationPlan.staleRiskSamples,
    actions: [
      liveFileTotal > 0
        ? 'Use atom-backed live file totals as the source of truth for compiler telemetry.'
        : 'Populate atoms before reconciling support-table drift.',
      staleFileRows > 0
        ? 'Purge or archive files rows whose paths are no longer present in the live atom graph.'
        : 'files table is aligned with the live atom graph.',
      staleRiskRows > 0
        ? 'Purge or archive stale risk rows after their owning files disappear from atoms.'
        : 'risk_assessments is aligned with the live atom graph.'
    ]
  });
}
