import { normalizeSnapshotPath } from '../../../shared/compiler/index.js';
import { runTechnicalDebtReportInsert, persistTechnicalDebtReportWithValues } from './technical-debt-report-sql.js';

export { runTechnicalDebtReportInsert, persistTechnicalDebtReportWithValues };

export function buildTechnicalDebtReportValues({
  projectPath,
  scopePath,
  focusPath,
  currentSnapshot,
  report,
  fingerprint
} = {}) {
  const current = currentSnapshot.current || {};
  const summary = report.summary || {};
  const folderization = report.folderization || {};
  const issuePersistence = report.issuePersistence || {};
  const structuralGroups = report.structural?.totalGroups || 0;
  const conceptualGroups = report.conceptual?.totalGroups || 0;
  const pipelineOrphans = report.pipelineOrphans?.total || 0;
  const watcherOrphans = issuePersistence.orphanedIssues || 0;
  const activeWatcherIssues = issuePersistence.activeIssueCount || 0;
  const withoutLifecycle = issuePersistence.withoutLifecycle || 0;
  const withoutContext = issuePersistence.withoutContext || 0;
  const namingDebt = folderization.namingDebt?.renameTargetCount
    || folderization.naming?.renameTargetCount
    || 0;
  const summaryText = [
    `debt=${report.debtScore?.score || 0}/${report.debtScore?.level || 'low'}`,
    `structural=${structuralGroups}`,
    `conceptual=${conceptualGroups}`,
    `watchers=${activeWatcherIssues}`,
    `orphans=${pipelineOrphans}`,
    `issuePersistence=${watcherOrphans}/${withoutLifecycle}/${withoutContext}`,
    `folder=${folderization.summary?.candidateCount || 0}`,
    `naming=${namingDebt}`
  ].join(' | ');

  return {
    project_path: projectPath || null,
    snapshot_kind: 'technical_debt',
    scope_path: normalizeSnapshotPath(scopePath),
    focus_path: normalizeSnapshotPath(focusPath),
    capture_source: 'mcp.tool.get_technical_debt_report',
    analysis_generation_id: null,
    captured_at: new Date().toISOString(),
    health_score: Number(current.healthScore || 0),
    health_grade: current.healthGrade || 'F',
    issue_count: Number(summary.structuralDuplicates?.duplicateGroups || 0)
      + Number(summary.conceptualDuplicates?.actionableGroups || 0)
      + Number(summary.pipelineHealth?.orphans || 0)
      + Number(summary.folderization?.candidateCount || 0),
    structural_groups: structuralGroups,
    conceptual_groups: conceptualGroups,
    conceptual_raw_groups: Number(report.conceptual?.rawGroups || 0),
    pipeline_orphans: pipelineOrphans,
    issue_persistence_orphans: Number(watcherOrphans || 0),
    issue_persistence_active: Number(activeWatcherIssues || 0),
    issue_persistence_without_lifecycle: Number(withoutLifecycle || 0),
    issue_persistence_without_context: Number(withoutContext || 0),
    folderization_candidate_count: Number(folderization.summary?.candidateCount || 0),
    flat_families: Number(folderization.summary?.flatFamilies || 0),
    mixed_families: Number(folderization.summary?.mixedFamilies || 0),
    already_folderized_families: Number(folderization.summary?.alreadyFolderizedFamilies || 0),
    naming_families: Number(folderization.summary?.namingFamilies || 0),
    naming_targets: Number(folderization.summary?.namingTargets || 0),
    naming_debt: Number(namingDebt || 0),
    live_coverage_ratio: Number(current.liveCoverageRatio || 0),
    active_atoms: Number(current.activeAtoms || 0),
    zero_atom_file_count: Number(current.zeroAtomFileCount || 0),
    call_links: Number(current.callLinks || 0),
    semantic_links: Number(current.semanticLinks || 0),
    watcher_alert_count: Number(current.watcherAlertCount || 0),
    recent_warning_count: Number(current.recentWarningCount || 0),
    recent_error_count: Number(current.recentErrorCount || 0),
    phase2_pending_files: Number(current.phase2PendingFiles || 0),
    drift_state: current.driftState || current.behaviorState || null,
    drift_score: Number(current.driftScore || 0),
    stability_score: Number(current.stabilityScore || 0),
    success_score: Number(current.successScore || 0),
    success_threshold: Number(current.successThreshold || 85),
    mvp_ready: current.mvpReady ? 1 : 0,
    behavior_state: current.behaviorState || null,
    readiness_reason: current.readinessReason || null,
    snapshot_fingerprint: fingerprint || currentSnapshot.current?.snapshotFingerprint || null,
    summary_text: summaryText,
    payload_json: JSON.stringify({
      fingerprint: fingerprint || currentSnapshot.current?.snapshotFingerprint || null,
      report,
      issuePersistence,
      currentSnapshot: {
        fingerprint: currentSnapshot.current?.snapshotFingerprint || null,
        summary: currentSnapshot.summary || null,
        current: currentSnapshot.current || null
      }
    }),
    trend_json: JSON.stringify({
      debtScore: report.debtScore || null,
      priorityActions: report.priorityActions || [],
      summary: report.summary || null
    })
  };
}
