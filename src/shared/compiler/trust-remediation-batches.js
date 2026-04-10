function getGate(report, key) {
  return (report?.gates || []).find((gate) => gate?.key === key) || null;
}

function gateSnapshot(gate, key) {
  return {
    key,
    state: gate?.state || 'missing',
    blocking: gate?.blocking === true,
    reason: gate?.reason || null,
    recommendation: gate?.recommendation || null,
    evidence: gate?.evidence || null
  };
}

function folderizationSnapshot(report) {
  const folderization = report?.inventory?.canonicalPromotion || null;
  const inventoryState = report?.inventory?.report?.inventoryState || 'watching';
  const state = folderization?.folderizationState || null;
  const decision = folderization?.folderizationDecision || null;

  return {
    key: 'batch_5_folderization',
    title: 'Folderization and naming debt',
    state: decision === 'already_folderized' || state === 'fresh'
      ? 'green'
      : (inventoryState === 'blocked' ? 'blocked' : 'watching'),
    blocking: inventoryState === 'blocked',
    reason: folderization?.summaryText || folderization?.nextAction || 'Folderization and naming debt still require cleanup.',
    recommendation: folderization?.nextAction || 'Normalize folderized family names after hard drifts are repaired.',
    compareWith: [
      'get_folderization_snapshot',
      'get_system_inventory_report',
      'get_technical_debt_report'
    ],
    exitCriteria: [
      'Naming debt reduced on the safest families first',
      'Folderized families stay import-safe',
      'No broken exports after renames'
    ],
    evidence: {
      folderizationState: state,
      folderizationDecision: decision,
      folderizedFamilyCount: folderization?.folderizedFamilyCount || 0,
      emergentCandidateCount: folderization?.emergentCandidateCount || 0,
      canonicalCandidateCount: folderization?.canonicalCandidateCount || 0
    }
  };
}

export function buildTrustRemediationBatchPlan(report = null) {
  const batch0 = {
    key: 'batch_0_baseline',
    title: 'Fix baseline canonical',
    state: report?.success === true ? 'green' : 'blocked',
    blocking: report?.success !== true,
    reason: report?.success === true
      ? 'Baseline trust snapshot captured.'
      : 'Trust snapshot is unavailable.',
    recommendation: report?.success === true
      ? 'Use the current trust snapshot as the comparison baseline.'
      : 'Capture a trust snapshot before any remediation batch.',
    compareWith: [
      'get_health_panel',
      'get_metrics_snapshot',
      'get_system_inventory_report',
      'get_technical_debt_report',
      'check_pipeline_integrity',
      'get_folderization_snapshot',
      'diagnose_tool_health'
    ],
    exitCriteria: [
      'Baseline snapshot captured and persisted',
      'Same MCP report set available for before/after comparison'
    ]
  };

  const batch1 = gateSnapshot(getGate(report, 'issue_persistence'), 'batch_1_issue_persistence');
  batch1.title = 'Issue persistence and orphans';
  batch1.compareWith = [
    'check_pipeline_integrity',
    'get_technical_debt_report',
    'get_metrics_snapshot'
  ];
  batch1.exitCriteria = [
    'Watcher orphans reconciled',
    'Pipeline orphans explained or eliminated',
    'Lifecycle and context consistent across surfaces'
  ];

  const batch2 = gateSnapshot(getGate(report, 'policy_drift'), 'batch_2_policy_drift');
  batch2.title = 'Policy drift and canonical inventory';
  batch2.compareWith = [
    'get_system_inventory_report',
    'get_metrics_snapshot',
    'get_health_panel'
  ];
  batch2.exitCriteria = [
    'Policy drift reduced materially',
    'Canonical inventory gap closed or explained',
    'Wrappers and bridges aligned with canonical surfaces'
  ];

  const batch3 = gateSnapshot(getGate(report, 'metadata_coverage'), 'batch_3_metadata_coverage');
  batch3.title = 'Metadata coverage and extraction contract';
  batch3.compareWith = [
    'get_system_inventory_report',
    'get_metrics_snapshot',
    'get_health_panel'
  ];
  batch3.exitCriteria = [
    'Metadata coverage at or above trust threshold',
    'No new inventory gaps caused by coverage repair',
    'Coverage numbers stable across repeated snapshots'
  ];

  const batch4 = gateSnapshot(getGate(report, 'tool_latency'), 'batch_4_tool_latency');
  batch4.title = 'Tool latency and operational noise';
  batch4.compareWith = [
    'diagnose_tool_health',
    'get_health_panel',
    'get_metrics_snapshot'
  ];
  batch4.exitCriteria = [
    'Critical tools below latency threshold',
    'Observability noise no longer distorts comparisons'
  ];

  const batch5 = folderizationSnapshot(report);
  const batch6 = {
    key: 'batch_6_confidence_closeout',
    title: 'Cierre y validacion de confianza',
    state: [batch1, batch2, batch3, batch4, batch5].some((batch) => batch.blocking)
      ? 'blocked'
      : [batch1, batch2, batch3, batch4, batch5].some((batch) => batch.state === 'watching')
        ? 'watching'
        : 'green',
    blocking: [batch1, batch2, batch3, batch4, batch5].some((batch) => batch.blocking),
    reason: 'Final verification depends on the previous remediation batches.',
    recommendation: 'Re-run the full comparison set after the blocked batches are repaired.',
    compareWith: [
      'get_health_panel',
      'get_metrics_snapshot',
      'get_system_inventory_report',
      'get_technical_debt_report',
      'check_pipeline_integrity',
      'diagnose_tool_health',
      'get_folderization_snapshot'
    ],
    exitCriteria: [
      'DB core still A+',
      'Control plane not blocked',
      'No unresolved contradictions across the canonical report set'
    ]
  };

  const batches = [batch0, batch1, batch2, batch3, batch4, batch5, batch6];
  const blockingCount = batches.filter((batch) => batch.blocking).length;
  const watchingCount = batches.filter((batch) => batch.state === 'watching').length;
  const greenCount = batches.filter((batch) => batch.state === 'green').length;

  return {
    state: blockingCount > 0 ? 'blocked' : watchingCount > 0 ? 'watching' : 'ready',
    blockingCount,
    watchingCount,
    greenCount,
    batches,
    compareTools: batch0.compareWith,
    nextBatch: batches.find((batch) => batch.blocking || batch.state === 'watching') || null
  };
}

export function summarizeTrustRemediationBatchPlan(plan = null) {
  if (!plan || typeof plan !== 'object') {
    return null;
  }

  return {
    state: plan.state || 'missing',
    blockingCount: Number(plan.blockingCount || 0),
    watchingCount: Number(plan.watchingCount || 0),
    greenCount: Number(plan.greenCount || 0),
    nextBatchKey: plan.nextBatch?.key || null,
    nextBatchTitle: plan.nextBatch?.title || null,
    compareTools: Array.isArray(plan.compareTools) ? plan.compareTools.slice(0, 7) : [],
    batches: Array.isArray(plan.batches)
      ? plan.batches.map((batch) => ({
        key: batch.key,
        title: batch.title,
        state: batch.state,
        blocking: batch.blocking === true,
        reason: batch.reason,
        recommendation: batch.recommendation
      }))
      : []
  };
}

export default {
  buildTrustRemediationBatchPlan,
  summarizeTrustRemediationBatchPlan
};
