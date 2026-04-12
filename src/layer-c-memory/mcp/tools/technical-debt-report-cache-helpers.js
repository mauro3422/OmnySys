import { normalizeSnapshotPath } from '../../../shared/compiler/index.js';
import { runTechnicalDebtReportInsert, persistTechnicalDebtReportWithValues } from './technical-debt-report-sql.js';

export { runTechnicalDebtReportInsert, persistTechnicalDebtReportWithValues };

function extractDebtCounters(report = {}) {
  const structural = report.structural || {};
  const conceptual = report.conceptual || {};
  const pipeline = report.pipelineOrphans || {};
  const issues = report.issuePersistence || {};

  return {
    structuralGroups: structural.totalGroups || 0,
    conceptualGroups: conceptual.totalGroups || 0,
    conceptualRawGroups: conceptual.rawGroups || 0,
    pipelineOrphans: pipeline.total || 0,
    watcherOrphans: issues.orphanedIssues || 0,
    activeWatcherIssues: issues.activeIssueCount || 0,
    withoutLifecycle: issues.withoutLifecycle || 0,
    withoutContext: issues.withoutContext || 0
  };
}

function extractFolderizationSummary(report = {}) {
  const folderization = report.folderization || {};
  const summary = folderization.summary || {};
  const naming = folderization.namingDebt || folderization.naming || {};

  return {
    candidateCount: summary.candidateCount || 0,
    flatFamilies: summary.flatFamilies || 0,
    mixedFamilies: summary.mixedFamilies || 0,
    alreadyFolderizedFamilies: summary.alreadyFolderizedFamilies || 0,
    namingFamilies: summary.namingFamilies || 0,
    namingTargets: summary.namingTargets || 0,
    namingDebt: naming.renameTargetCount || 0
  };
}

function buildSummaryText(debtScore, counters, folderization) {
  return [
    `debt=${debtScore?.score || 0}/${debtScore?.level || 'low'}`,
    `structural=${counters.structuralGroups}`,
    `conceptual=${counters.conceptualGroups}`,
    `watchers=${counters.activeWatcherIssues}`,
    `orphans=${counters.pipelineOrphans}`,
    `issuePersistence=${counters.watcherOrphans}/${counters.withoutLifecycle}/${counters.withoutContext}`,
    `folder=${folderization.candidateCount}`,
    `naming=${folderization.namingDebt}`
  ].join(' | ');
}

function buildSnapshotValues(current = {}) {
  return {
    health_score: Number(current.healthScore || 0),
    health_grade: current.healthGrade || 'F',
    drift_state: current.driftState || current.behaviorState || null,
    drift_score: Number(current.driftScore || 0),
    stability_score: Number(current.stabilityScore || 0),
    success_score: Number(current.successScore || 0),
    success_threshold: Number(current.successThreshold || 85),
    mvp_ready: current.mvpReady ? 1 : 0,
    behavior_state: current.behaviorState || null,
    readiness_reason: current.readinessReason || null,
    live_coverage_ratio: Number(current.liveCoverageRatio || 0),
    active_atoms: Number(current.activeAtoms || 0),
    zero_atom_file_count: Number(current.zeroAtomFileCount || 0),
    call_links: Number(current.callLinks || 0),
    semantic_links: Number(current.semanticLinks || 0),
    watcher_alert_count: Number(current.watcherAlertCount || 0),
    recent_warning_count: Number(current.recentWarningCount || 0),
    recent_error_count: Number(current.recentErrorCount || 0),
    phase2_pending_files: Number(current.phase2PendingFiles || 0)
  };
}

function buildIssueCount(summary = {}) {
  return Number(summary.structuralDuplicates?.duplicateGroups || 0)
    + Number(summary.conceptualDuplicates?.actionableGroups || 0)
    + Number(summary.pipelineHealth?.orphans || 0)
    + Number(summary.folderization?.candidateCount || 0);
}

function resolveFingerprint(fingerprint, currentSnapshot) {
  return fingerprint || currentSnapshot?.current?.snapshotFingerprint || null;
}

export function buildTechnicalDebtReportValues({
  projectPath,
  scopePath,
  focusPath,
  currentSnapshot,
  report,
  fingerprint
} = {}) {
  const current = currentSnapshot.current || {};
  const counters = extractDebtCounters(report);
  const folderization = extractFolderizationSummary(report);
  const snapshotValues = buildSnapshotValues(current);
  const resolvedFingerprint = resolveFingerprint(fingerprint, currentSnapshot);
  const summaryText = buildSummaryText(report.debtScore, counters, folderization);

  return {
    project_path: projectPath || null,
    snapshot_kind: 'technical_debt',
    scope_path: normalizeSnapshotPath(scopePath),
    focus_path: normalizeSnapshotPath(focusPath),
    capture_source: 'mcp.tool.get_technical_debt_report',
    analysis_generation_id: null,
    captured_at: new Date().toISOString(),
    issue_count: buildIssueCount(report.summary || {}),
    structural_groups: counters.structuralGroups,
    conceptual_groups: counters.conceptualGroups,
    conceptual_raw_groups: Number(counters.conceptualRawGroups || 0),
    pipeline_orphans: counters.pipelineOrphans,
    issue_persistence_orphans: Number(counters.watcherOrphans || 0),
    issue_persistence_active: Number(counters.activeWatcherIssues || 0),
    issue_persistence_without_lifecycle: Number(counters.withoutLifecycle || 0),
    issue_persistence_without_context: Number(counters.withoutContext || 0),
    folderization_candidate_count: Number(folderization.candidateCount || 0),
    flat_families: Number(folderization.flatFamilies || 0),
    mixed_families: Number(folderization.mixedFamilies || 0),
    already_folderized_families: Number(folderization.alreadyFolderizedFamilies || 0),
    naming_families: Number(folderization.namingFamilies || 0),
    naming_targets: Number(folderization.namingTargets || 0),
    naming_debt: Number(folderization.namingDebt || 0),
    ...snapshotValues,
    snapshot_fingerprint: resolvedFingerprint,
    summary_text: summaryText,
    payload_json: JSON.stringify({
      fingerprint: resolvedFingerprint,
      report,
      issuePersistence: report.issuePersistence || {},
      currentSnapshot: {
        fingerprint: resolvedFingerprint,
        summary: currentSnapshot.summary || null,
        current
      }
    }),
    trend_json: JSON.stringify({
      debtScore: report.debtScore || null,
      priorityActions: report.priorityActions || [],
      summary: report.summary || null
    })
  };
}
