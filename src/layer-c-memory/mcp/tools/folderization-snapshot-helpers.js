import { createHash } from 'node:crypto';
import { normalizeSnapshotPath } from '#shared/compiler/snapshot-path.js';

export function buildFolderizationSnapshotFingerprint(snapshot = null) {
  return createHash('sha1')
    .update(JSON.stringify({
      projectPath: snapshot?.projectPath || null,
      scopePath: snapshot?.scopePath || null,
      focusPath: snapshot?.focusPath || null,
      snapshotKind: snapshot?.snapshotKind || 'folderization',
      summary: snapshot?.summary || null
    }))
    .digest('hex')
    .slice(0, 16);
}

export function parseFolderizationSnapshotPayload(row = null) {
  if (!row) {
    return null;
  }

  try {
    const payload = row.payload_json ? JSON.parse(row.payload_json) : null;
    const folderization = payload?.folderization || payload?.snapshot?.folderization || null;
    if (!folderization) {
      return null;
    }

    return {
      ...folderization,
      summary: folderization.summary || payload?.summary || null,
      recommendation: folderization.recommendation || null,
      decision: folderization.decision || payload?.snapshot?.folderization?.decision || 'reject'
    };
  } catch {
    return null;
  }
}

function summarizeFolderizationHistoryRow(row = null) {
  if (!row) {
    return null;
  }

  let payload = null;
  try {
    payload = row.payload_json ? JSON.parse(row.payload_json) : null;
  } catch {
    payload = null;
  }

  return {
    capturedAt: row.captured_at || null,
    healthScore: Number(row.health_score || 0),
    healthGrade: row.health_grade || 'F',
    activeAtoms: Number(row.active_atoms || 0),
    candidateCount: Number(row.folderization_candidate_count || 0),
    flatFamilies: Number(row.flat_families || 0),
    mixedFamilies: Number(row.mixed_families || 0),
    alreadyFolderizedFamilies: Number(row.already_folderized_families || 0),
    namingFamilies: Number(row.naming_families || 0),
    namingTargets: Number(row.naming_targets || 0),
    namingDebt: Number(row.naming_debt || 0),
    dbSyncState: row.drift_state || null,
    summary: payload?.summary || null,
    snapshot: payload?.snapshot || payload || null
  };
}

export function loadFolderizationSnapshotHistory(db, {
  projectPath = null,
  scopePath = null,
  focusPath = null,
  limit = 5
} = {}) {
  if (!db?.prepare) {
    return [];
  }

  try {
    const rows = db.prepare(`
      SELECT
        captured_at,
        health_score,
        health_grade,
        active_atoms,
        folderization_candidate_count,
        flat_families,
        mixed_families,
        already_folderized_families,
        naming_families,
        naming_targets,
        naming_debt,
        drift_state,
        summary_text,
        payload_json
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = 'folderization'
        AND (? IS NULL OR scope_path = ?)
        AND (? IS NULL OR focus_path = ?)
      ORDER BY captured_at DESC
      LIMIT ?
    `).all(
      projectPath,
      scopePath,
      scopePath,
      focusPath,
      focusPath,
      Math.max(1, Number(limit) || 5)
    );

    return Array.isArray(rows) ? rows.map((row) => summarizeFolderizationHistoryRow(row)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function buildFolderizationSnapshotTrend(current = null, history = []) {
  const previous = Array.isArray(history) && history.length > 0 ? history[0] : null;
  if (!current || !previous) {
    return {
      status: 'initial',
      summary: 'First folderization snapshot captured.',
      deltaSincePrevious: null
    };
  }

  const deltaCandidateCount = Number(current.summary?.candidateCount || 0) - Number(previous.summary?.candidateCount || 0);
  const deltaNamingTargets = Number(current.summary?.namingTargets || 0) - Number(previous.summary?.namingTargets || 0);
  const deltaFlatFamilies = Number(current.summary?.flatFamilies || 0) - Number(previous.summary?.flatFamilies || 0);
  const deltaDbSync = current.summary?.dbSyncState === previous.summary?.dbSyncState ? 0 : 1;
  const score = (deltaCandidateCount * -1) + (deltaNamingTargets * -1) + (deltaFlatFamilies * -2) + (deltaDbSync * -5);

  return {
    status: score < 0 ? 'improving' : score > 0 ? 'regressing' : 'stable',
    summary: score < 0
      ? 'Folderization pressure is easing.'
      : score > 0
        ? 'Folderization pressure is increasing.'
        : 'Folderization pressure is stable.',
    deltaSincePrevious: {
      candidateCount: deltaCandidateCount,
      namingTargets: deltaNamingTargets,
      flatFamilies: deltaFlatFamilies,
      dbSyncState: deltaDbSync
    }
  };
}

export function persistFolderizationSnapshot(db, snapshot = null) {
  if (!db?.prepare || !snapshot) {
    return null;
  }

  const summary = snapshot.summary || {};
  const databaseHealth = snapshot.databaseHealth || null;
  const liveRowSync = summary.liveRowSync || null;
  const payload = {
    snapshot,
    summary,
    folderization: snapshot.folderization || {},
    databaseHealth
  };
  const trend = snapshot.trend || buildFolderizationSnapshotTrend(snapshot, []);

  const stmt = db.prepare(`
    INSERT INTO compiler_metrics_snapshots (
      project_path,
      snapshot_kind,
      scope_path,
      focus_path,
      capture_source,
      analysis_generation_id,
      captured_at,
      health_score,
      health_grade,
      issue_count,
      structural_groups,
      conceptual_groups,
      conceptual_raw_groups,
      pipeline_orphans,
      folderization_candidate_count,
      flat_families,
      mixed_families,
      already_folderized_families,
      naming_families,
      naming_targets,
      naming_debt,
      live_coverage_ratio,
      active_atoms,
      zero_atom_file_count,
      call_links,
      semantic_links,
      watcher_alert_count,
      recent_warning_count,
      recent_error_count,
      phase2_pending_files,
      drift_state,
      drift_score,
      stability_score,
      success_score,
      success_threshold,
      mvp_ready,
      behavior_state,
      readiness_reason,
      snapshot_fingerprint,
      summary_text,
      payload_json,
      trend_json
    ) VALUES (
      @project_path,
      @snapshot_kind,
      @scope_path,
      @focus_path,
      @capture_source,
      @analysis_generation_id,
      @captured_at,
      @health_score,
      @health_grade,
      @issue_count,
      @structural_groups,
      @conceptual_groups,
      @conceptual_raw_groups,
      @pipeline_orphans,
      @folderization_candidate_count,
      @flat_families,
      @mixed_families,
      @already_folderized_families,
      @naming_families,
      @naming_targets,
      @naming_debt,
      @live_coverage_ratio,
      @active_atoms,
      @zero_atom_file_count,
      @call_links,
      @semantic_links,
      @watcher_alert_count,
      @recent_warning_count,
      @recent_error_count,
      @phase2_pending_files,
      @drift_state,
      @drift_score,
      @stability_score,
      @success_score,
      @success_threshold,
      @mvp_ready,
      @behavior_state,
      @readiness_reason,
      @snapshot_fingerprint,
      @summary_text,
      @payload_json,
      @trend_json
    )
  `);

  return stmt.run({
    project_path: snapshot.projectPath || null,
    snapshot_kind: snapshot.snapshotKind || 'folderization',
    scope_path: normalizeSnapshotPath(snapshot.scopePath || null),
    focus_path: normalizeSnapshotPath(snapshot.focusPath || null),
    capture_source: snapshot.captureSource || 'mcp.tool.get_folderization_snapshot',
    analysis_generation_id: null,
    captured_at: snapshot.capturedAt || new Date().toISOString(),
    health_score: Number(databaseHealth?.healthScore || 0),
    health_grade: databaseHealth?.grade || 'F',
    issue_count: Number(summary.candidateCount || 0) + Number(summary.namingTargets || 0),
    structural_groups: Number(summary.flatFamilies || 0),
    conceptual_groups: Number(summary.mixedFamilies || 0),
    conceptual_raw_groups: Number(summary.candidateCount || 0),
    pipeline_orphans: 0,
    folderization_candidate_count: Number(summary.candidateCount || 0),
    flat_families: Number(summary.flatFamilies || 0),
    mixed_families: Number(summary.mixedFamilies || 0),
    already_folderized_families: Number(summary.alreadyFolderizedFamilies || 0),
    naming_families: Number(summary.namingFamilies || 0),
    naming_targets: Number(summary.namingTargets || 0),
    naming_debt: Number(summary.namingTargets || 0),
    live_coverage_ratio: Number(databaseHealth?.metrics?.fileUniverse?.liveCoverageRatio || 0),
    active_atoms: Number(databaseHealth?.metrics?.activeAtoms || 0),
    zero_atom_file_count: Number(databaseHealth?.metrics?.fileUniverse?.zeroAtomFileCount || 0),
    call_links: 0,
    semantic_links: 0,
    watcher_alert_count: liveRowSync.state === 'blocked' ? 1 : 0,
    recent_warning_count: databaseHealth?.warnings?.length || 0,
    recent_error_count: databaseHealth?.criticalFindings?.length || 0,
    phase2_pending_files: 0,
    drift_state: liveRowSync.state || null,
    drift_score: liveRowSync.state === 'blocked' ? 100 : liveRowSync.state === 'stale' ? 50 : 0,
    stability_score: databaseHealth?.healthy === true ? 100 : 70,
    success_score: databaseHealth?.healthy === true ? 100 : 75,
    success_threshold: 85,
    mvp_ready: databaseHealth?.healthy === true ? 1 : 0,
    behavior_state: liveRowSync.state === 'blocked' ? 'blocked' : (databaseHealth?.healthy === true ? 'ready' : 'watchful'),
    readiness_reason: liveRowSync.reason || databaseHealth?.summary || 'Folderization snapshot captured.',
    snapshot_fingerprint: buildFolderizationSnapshotFingerprint(snapshot),
    summary_text: summary.summaryText || null,
    payload_json: JSON.stringify(payload),
    trend_json: JSON.stringify(trend)
  });
}
