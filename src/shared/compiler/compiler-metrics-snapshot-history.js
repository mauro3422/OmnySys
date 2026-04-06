import {
  loadCompilerHealthArchiveHistory,
  loadCompilerMetricsArchiveHistory
} from './compiler-health-archive.js';
import { summarizeHistoryRow } from './compiler-metrics-current.js';
import { asNumber } from './core-utils.js';
import { normalizeSnapshotPath } from '#shared/utils/normalize-helpers.js';

export { asNumber, normalizeSnapshotPath };

function mergeHistoryRows(primaryRows = [], secondaryRows = []) {
  const rows = [...primaryRows, ...secondaryRows].filter(Boolean);
  const seen = new Set();

  return rows
    .filter((row) => {
      const fingerprint = row?.snapshot_fingerprint
        || `${row?.captured_at || 'unknown'}|${row?.health_score || 0}|${row?.issue_count || 0}|${row?.summary_text || ''}`;
      if (!fingerprint || seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    })
    .sort((left, right) => String(right?.captured_at || '').localeCompare(String(left?.captured_at || '')));
}

function buildTrendSummary(delta = {}) {
  const parts = [];
  const pushPart = (label, value, suffix = '') => {
    if (!Number.isFinite(value) || value === 0) return;
    const signed = value > 0 ? `+${value}` : `${value}`;
    parts.push(`${label} ${signed}${suffix}`);
  };
  pushPart('health', delta.healthScore);
  pushPart('issues', -delta.issueCount);
  pushPart('structural dups', -delta.structuralGroups);
  pushPart('conceptual dups', -delta.conceptualGroups);
  pushPart('orphans', -delta.pipelineOrphans);
  pushPart('naming targets', -delta.namingTargets);
  pushPart('flat families', -delta.flatFamilies);
  pushPart('coverage', Math.round((delta.liveCoverageRatio || 0) * 100), '%');
  pushPart('atoms', delta.activeAtoms);
  pushPart('errors', -delta.recentErrorCount);
  return parts.length > 0 ? parts.join(', ') : 'No measurable change';
}

export function calculateProgressScore(delta = {}) {
  const weights = {
    healthScore: 1,
    issueCount: -1,
    structuralGroups: -3,
    conceptualGroups: -3,
    pipelineOrphans: -5,
    namingTargets: -0.15,
    flatFamilies: -0.5,
    liveCoverageRatio: 100,
    recentErrorCount: -5,
    recentWarningCount: -1,
    watcherAlertCount: -2,
    phase2PendingFiles: -1,
    alreadyFolderizedFamilies: 0.5
  };
  return Object.entries(weights).reduce((score, [key, weight]) => score + (asNumber(delta[key], 0) * weight), 0);
}

export function resolveMinStableTrendDays() {
  const raw = Number(process.env.OMNYSYS_MIN_STABLE_TREND_DAYS);
  if (!Number.isFinite(raw) || raw <= 0) return 0.25;
  return Math.max(0.25, raw);
}

export function shouldMuteBootstrapTrend(trend = null) {
  if (!trend || typeof trend !== 'object') return true;
  if (trend.status === 'initial' || trend.status === 'settling') return true;
  const minStableTrendDays = resolveMinStableTrendDays();
  const daysSinceBaseline = asNumber(trend.daysSinceBaseline, 0);
  return daysSinceBaseline > 0 && daysSinceBaseline < minStableTrendDays;
}

export function muteBootstrapTrend(trend = null) {
  const minStableTrendDays = resolveMinStableTrendDays();
  return {
    ...trend,
    status: trend?.status === 'initial' ? 'initial' : 'settling',
    progressScore: 0,
    velocityPerDay: 0,
    deltaSinceBaseline: {},
    summary: trend?.status === 'initial'
      ? 'First metrics snapshot captured.'
      : `Bootstrap trend settling; waiting for a baseline at least ${Math.round(minStableTrendDays * 24)}h old.`
  };
}

export function loadCompilerMetricsSnapshotHistory(db, options = {}) {
  if (!db?.prepare) {
    return { entries: [], latest: null, previous: null, baseline: null };
  }

  const {
    projectPath = null,
    snapshotKind = 'status',
    scopePath = null,
    focusPath = null,
    limit = 12,
    compareDays = 3
  } = options;
  const normalizedScope = normalizeSnapshotPath(scopePath);
  const normalizedFocus = normalizeSnapshotPath(focusPath);

  try {
    const rows = db.prepare(`
      SELECT *
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
      ORDER BY captured_at DESC
      LIMIT ?
    `).all(projectPath, snapshotKind, normalizedScope, normalizedFocus, limit);

    const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
    const baselineRow = db.prepare(`
      SELECT *
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = ?
        AND IFNULL(scope_path, '') = IFNULL(?, '')
        AND IFNULL(focus_path, '') = IFNULL(?, '')
        AND captured_at <= ?
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(projectPath, snapshotKind, normalizedScope, normalizedFocus, baselineCutoff) || null;
    const archiveHistory = projectPath
      ? loadCompilerHealthArchiveHistory(projectPath, {
          snapshotKind,
          scopePath: normalizedScope,
          focusPath: normalizedFocus,
          limit,
          compareDays
        })
      : { entries: [], latest: null, previous: null, baseline: null };
    const metricsArchiveHistory = projectPath
      ? loadCompilerMetricsArchiveHistory(projectPath, {
          snapshotKind,
          scopePath: normalizedScope,
          focusPath: normalizedFocus,
          limit,
          compareDays
        })
      : { entries: [], latest: null, previous: null, baseline: null };
    const shouldMergeArchive = Boolean(projectPath) && rows.length === 0;
    const mergedArchiveRows = mergeHistoryRows(archiveHistory.entries, metricsArchiveHistory.entries);
    const mergedRows = shouldMergeArchive ? mergeHistoryRows(rows, mergedArchiveRows).slice(0, limit) : rows;
    const archiveBaseline = shouldMergeArchive ? metricsArchiveHistory.baseline || archiveHistory.baseline || null : null;
    const archivePrevious = shouldMergeArchive ? metricsArchiveHistory.previous || archiveHistory.previous || null : null;
    const archiveLatest = shouldMergeArchive ? metricsArchiveHistory.latest || archiveHistory.latest || null : null;
    const mergedBaseline = baselineRow
      || (shouldMergeArchive ? mergedRows.find((row) => String(row.captured_at || '') <= baselineCutoff) || archiveBaseline : null)
      || null;

    return {
      entries: mergedRows.map(summarizeHistoryRow),
      latest: summarizeHistoryRow(mergedRows[0] || archiveLatest || rows[0] || null),
      previous: summarizeHistoryRow(mergedRows[1] || archivePrevious || rows[1] || null),
      baseline: summarizeHistoryRow(mergedBaseline)
    };
  } catch {
    return { entries: [], latest: null, previous: null, baseline: null };
  }
}

export function buildCompilerMetricsTrend(current = null, history = null, compareDays = 3) {
  const previous = history?.previous || null;
  const baseline = history?.baseline || previous || null;
  const minStableTrendDays = resolveMinStableTrendDays();

  if (!current) {
    return {
      status: 'missing',
      daysSincePrevious: 0,
      daysSinceBaseline: 0,
      progressScore: 0,
      velocityPerDay: 0,
      improvingStreak: false,
      behaviorTrend: 0,
      summary: 'No metrics snapshot available.',
      deltaSincePrevious: {},
      deltaSinceBaseline: {}
    };
  }

  const currentCapturedAt = new Date(current.capturedAt || Date.now()).getTime();
  const previousCapturedAt = previous?.capturedAt ? new Date(previous.capturedAt).getTime() : null;
  const baselineCapturedAt = baseline?.capturedAt ? new Date(baseline.capturedAt).getTime() : null;
  const daysSincePrevious = previousCapturedAt ? Math.max(0.01, (currentCapturedAt - previousCapturedAt) / (24 * 60 * 60 * 1000)) : 0;
  const daysSinceBaseline = baselineCapturedAt ? Math.max(0.01, (currentCapturedAt - baselineCapturedAt) / (24 * 60 * 60 * 1000)) : 0;
  const hasStableBaseline = Boolean(baseline) && daysSinceBaseline >= minStableTrendDays;

  const deltaSincePrevious = previous ? {
    healthScore: asNumber(current.healthScore) - asNumber(previous.healthScore),
    issueCount: asNumber(current.issueCount) - asNumber(previous.issueCount),
    structuralGroups: asNumber(current.structuralGroups) - asNumber(previous.structuralGroups),
    conceptualGroups: asNumber(current.conceptualGroups) - asNumber(previous.conceptualGroups),
    conceptualRawGroups: asNumber(current.conceptualRawGroups) - asNumber(previous.conceptualRawGroups),
    pipelineOrphans: asNumber(current.pipelineOrphans) - asNumber(previous.pipelineOrphans),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount) - asNumber(previous.folderizationCandidateCount),
    flatFamilies: asNumber(current.flatFamilies) - asNumber(previous.flatFamilies),
    mixedFamilies: asNumber(current.mixedFamilies) - asNumber(previous.mixedFamilies),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies) - asNumber(previous.alreadyFolderizedFamilies),
    namingFamilies: asNumber(current.namingFamilies) - asNumber(previous.namingFamilies),
    namingTargets: asNumber(current.namingTargets) - asNumber(previous.namingTargets),
    namingDebt: asNumber(current.namingDebt) - asNumber(previous.namingDebt),
    liveCoverageRatio: asNumber(current.liveCoverageRatio) - asNumber(previous.liveCoverageRatio),
    activeAtoms: asNumber(current.activeAtoms) - asNumber(previous.activeAtoms),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount) - asNumber(previous.zeroAtomFileCount),
    callLinks: asNumber(current.callLinks) - asNumber(previous.callLinks),
    semanticLinks: asNumber(current.semanticLinks) - asNumber(previous.semanticLinks),
    watcherAlertCount: asNumber(current.watcherAlertCount) - asNumber(previous.watcherAlertCount),
    recentWarningCount: asNumber(current.recentWarningCount) - asNumber(previous.recentWarningCount),
    recentErrorCount: asNumber(current.recentErrorCount) - asNumber(previous.recentErrorCount),
    phase2PendingFiles: asNumber(current.phase2PendingFiles) - asNumber(previous.phase2PendingFiles)
  } : {};

  const deltaSinceBaseline = hasStableBaseline ? {
    healthScore: asNumber(current.healthScore) - asNumber(baseline.healthScore),
    issueCount: asNumber(current.issueCount) - asNumber(baseline.issueCount),
    structuralGroups: asNumber(current.structuralGroups) - asNumber(baseline.structuralGroups),
    conceptualGroups: asNumber(current.conceptualGroups) - asNumber(baseline.conceptualGroups),
    conceptualRawGroups: asNumber(current.conceptualRawGroups) - asNumber(baseline.conceptualRawGroups),
    pipelineOrphans: asNumber(current.pipelineOrphans) - asNumber(baseline.pipelineOrphans),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount) - asNumber(baseline.folderizationCandidateCount),
    flatFamilies: asNumber(current.flatFamilies) - asNumber(baseline.flatFamilies),
    mixedFamilies: asNumber(current.mixedFamilies) - asNumber(baseline.mixedFamilies),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies) - asNumber(baseline.alreadyFolderizedFamilies),
    namingFamilies: asNumber(current.namingFamilies) - asNumber(baseline.namingFamilies),
    namingTargets: asNumber(current.namingTargets) - asNumber(baseline.namingTargets),
    namingDebt: asNumber(current.namingDebt) - asNumber(baseline.namingDebt),
    liveCoverageRatio: asNumber(current.liveCoverageRatio) - asNumber(baseline.liveCoverageRatio),
    activeAtoms: asNumber(current.activeAtoms) - asNumber(baseline.activeAtoms),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount) - asNumber(baseline.zeroAtomFileCount),
    callLinks: asNumber(current.callLinks) - asNumber(baseline.callLinks),
    semanticLinks: asNumber(current.semanticLinks) - asNumber(baseline.semanticLinks),
    watcherAlertCount: asNumber(current.watcherAlertCount) - asNumber(baseline.watcherAlertCount),
    recentWarningCount: asNumber(current.recentWarningCount) - asNumber(baseline.recentWarningCount),
    recentErrorCount: asNumber(current.recentErrorCount) - asNumber(baseline.recentErrorCount),
    phase2PendingFiles: asNumber(current.phase2PendingFiles) - asNumber(baseline.phase2PendingFiles)
  } : {};

  const progressScore = hasStableBaseline ? calculateProgressScore(deltaSinceBaseline, current, baseline) : 0;
  const velocityPerDay = hasStableBaseline && daysSinceBaseline > 0 ? Number((progressScore / daysSinceBaseline).toFixed(2)) : 0;
  const recentWindow = Array.isArray(history?.entries) ? history.entries.slice(0, 4) : [];
  const improvingStreak = recentWindow.slice(0, 3).every((entry, index, array) => {
    const next = array[index + 1];
    if (!next) return true;
    return asNumber(entry?.healthScore, 0) >= asNumber(next?.healthScore, 0) && asNumber(entry?.issueCount, 0) <= asNumber(next?.issueCount, 0);
  });
  const behaviorTrend = recentWindow.length >= 2 ? (asNumber(recentWindow[0]?.healthScore, 0) - asNumber(recentWindow[recentWindow.length - 1]?.healthScore, 0)) : 0;
  const status = !baseline ? 'initial' : !hasStableBaseline ? 'settling' : progressScore > 0 ? 'improving' : progressScore < 0 ? 'regressing' : 'stable';

  const trend = {
    status,
    compareDays,
    daysSincePrevious,
    daysSinceBaseline,
    progressScore: Number(progressScore.toFixed(2)),
    velocityPerDay,
    improvingStreak,
    behaviorTrend: Number(behaviorTrend.toFixed(2)),
    summary: !baseline ? 'First metrics snapshot captured.' : !hasStableBaseline ? `Bootstrap trend settling; waiting for a baseline at least ${Math.round(minStableTrendDays * 24)}h old.` : buildTrendSummary(deltaSinceBaseline),
    deltaSincePrevious,
    deltaSinceBaseline,
    baselineCapturedAt: baseline?.capturedAt || null,
    previousCapturedAt: previous?.capturedAt || null
  };

  return shouldMuteBootstrapTrend(trend) ? muteBootstrapTrend(trend) : trend;
}
