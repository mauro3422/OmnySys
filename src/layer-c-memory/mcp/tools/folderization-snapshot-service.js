/**
 * Shared service for building lightweight folderization snapshots.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  buildEmptyFolderizationReport,
  buildFolderizationReportFromRepo,
  getDatabaseHealthSummary
} from '../../../shared/compiler/index.js';
import {
  buildFolderizationSnapshotFingerprint,
  buildFolderizationSnapshotTrend,
  loadFolderizationSnapshotHistory,
  persistFolderizationSnapshot
} from './folderization-snapshot-helpers.js';

function normalizeFilePaths(filePaths = []) {
  return Array.isArray(filePaths)
    ? filePaths.map((filePath) => String(filePath || '').trim()).filter(Boolean)
    : [];
}

/**
 * Trunca semanticSurface para el snapshot, eliminando vistas legacy redundantes
 * que ya están en la DB (semantic_connections + atoms.semantic_metadata).
 * Mantiene solo resumenes y contract para diagnóstico.
 * Ahorra ~16MB por snapshot (3 vistas legacy de ~678 filas cada una).
 */
function summarizeSemanticSurfaceForSnapshot(semanticSurface) {
  if (!semanticSurface) return null;

  return {
    fileLevel: semanticSurface.fileLevel,
    atomLevel: semanticSurface.atomLevel,
    contract: semanticSurface.contract,
    healthy: semanticSurface.healthy,
    materiallyDrifting: semanticSurface.materiallyDrifting,
    materialIssues: semanticSurface.materialIssues || [],
    advisories: semanticSurface.advisories || [],
    // ❌ NO guardar: legacyView, persistedLegacyView, canonicalAdapterView
    // Estas vistas ya están en semantic_connections y atoms.semantic_metadata
  };
}

function summarizeLiveRowSync(liveRowSync = null) {
  if (!liveRowSync) {
    return {
      state: 'missing',
      healthy: false,
      trustworthy: false,
      staleRows: 0,
      reason: 'No live row sync summary is available.',
      recommendation: 'Reconcile the live support tables before trusting folderization guidance.'
    };
  }

  const staleRows =
    Number(liveRowSync?.summary?.staleAtomRows || 0) +
    Number(liveRowSync?.summary?.staleFileRows || 0) +
    Number(liveRowSync?.summary?.staleRiskRows || 0) +
    Number(liveRowSync?.summary?.staleRelationRows || 0) +
    Number(liveRowSync?.summary?.staleConnectionRows || 0);

  const state = liveRowSync.cleanupError
    ? 'blocked'
    : liveRowSync.skippedReason === 'phase2_settling'
      ? 'partial'
      : staleRows > 0
        ? 'stale'
        : 'fresh';

  return {
    state,
    healthy: liveRowSync.cleanupError ? false : staleRows === 0,
    trustworthy: liveRowSync.cleanupError ? false : staleRows === 0,
    staleRows,
    reason: liveRowSync.cleanupError?.message
      || (staleRows > 0 ? 'Live support tables are drifting from the atom graph.' : 'Live support tables are aligned with the atom graph.'),
    recommendation: liveRowSync.before?.recommendedActions?.[0]
      || (staleRows > 0 ? 'Reconcile the live support tables before trusting folderization guidance.' : 'Keep live-row reconciliation on the canonical path.'),
    evidence: liveRowSync
  };
}

function buildFolderizationSnapshotSummary({
  folderizationReport = null,
  databaseHealth = null,
  scopePath = null,
  focusPath = null,
  history = []
} = {}) {
  const summary = folderizationReport?.summary || {};
  const creationGuidance = folderizationReport?.creationGuidance || {};
  const liveRowSync = summarizeLiveRowSync(databaseHealth?.metrics?.liveRowSync || null);
  const trend = buildFolderizationSnapshotTrend({ summary: { ...summary, dbSyncState: liveRowSync.state } }, history);
  const folderizationDrift = folderizationReport?.drift || {
    state: liveRowSync.state,
    score: liveRowSync.state === 'blocked' ? 100 : liveRowSync.state === 'stale' ? 50 : 0,
    reason: liveRowSync.reason || null,
    recommendation: liveRowSync.recommendation || null,
    evidence: liveRowSync.evidence || null
  };
  const preferredFolder = creationGuidance.preferredFolder || creationGuidance.preferredDirectory || null;
  const preferredRoleStems = Array.isArray(creationGuidance.preferredRoleStems)
    ? creationGuidance.preferredRoleStems
    : [];
  const nextBestStem = preferredRoleStems[0]?.stem || 'core.js';
  const recommendedAction = liveRowSync.state !== 'fresh'
    ? liveRowSync.recommendation
    : preferredFolder
      ? `${creationGuidance.selectionReason || 'Reuse the closest DB-backed family.'} Create the next file inside ${preferredFolder} using ${nextBestStem}.`
      : 'Use role-only basenames and create the next helper under the closest folderized family, keeping the barrel at index.js.';
  const whyThisFirst = liveRowSync.state !== 'fresh'
    ? liveRowSync.reason
    : creationGuidance.selectionReason || 'The current scope has the strongest reusable folderization match in the DB.';

  return {
    scopePath,
    focusPath,
    decision: folderizationReport?.decision || 'reject',
    folderizationDrift,
    driftState: folderizationDrift.state || 'fresh',
    driftScore: Number(folderizationDrift.score || 0),
    driftReason: folderizationDrift.reason || null,
    driftRecommendation: folderizationDrift.recommendation || null,
    driftEvidence: folderizationDrift.evidence || null,
    dbSyncState: liveRowSync.state,
    databaseHealthy: databaseHealth?.healthy === true,
    healthScore: Number(databaseHealth?.healthScore || 0),
    healthGrade: databaseHealth?.grade || 'F',
    candidateCount: Number(summary.candidateCount || 0),
    flatFamilies: Number(summary.flatFamilies || 0),
    mixedFamilies: Number(summary.mixedFamilies || 0),
    alreadyFolderizedFamilies: Number(summary.alreadyFolderizedFamilies || 0),
    namingFamilies: Number(summary.namingFamilies || 0),
    namingTargets: Number(summary.namingTargets || 0),
    namingPatternCounts: summary.namingPatternCounts || {},
    guidanceScopePath: summary.guidanceScopePath || null,
    guidanceFocusPath: summary.guidanceFocusPath || null,
    recommendationStrategy: summary.recommendationStrategy || null,
    recommendedAction,
    nextBestFolder: preferredFolder,
    nextBestStem,
    whyThisFirst,
    trend,
    summaryText: [
      `folder=${summary.alreadyFolderizedFamilies || 0}/${(summary.flatFamilies || 0) + (summary.mixedFamilies || 0) + (summary.alreadyFolderizedFamilies || 0)}`,
      `candidates=${summary.candidateCount || 0}`,
      `naming=${summary.namingTargets || 0}`,
      `propagation=${summary.propagationImpactedFiles || 0}/${summary.propagationRewriteCount || 0}`,
      `drift=${folderizationDrift.state || 'fresh'}`,
      `dbsync=${liveRowSync.state}`,
      `health=${databaseHealth?.healthScore || 0}/${databaseHealth?.grade || 'F'}`
    ].join(' | '),
    liveRowSync
  };
}

function buildHistoryWithCurrent(snapshot = null, history = []) {
  if (!snapshot) {
    return history;
  }

  return [
    {
      capturedAt: snapshot.capturedAt || null,
      healthScore: Number(snapshot.summary?.healthScore || 0),
      healthGrade: snapshot.summary?.healthGrade || 'F',
      activeAtoms: Number(snapshot.databaseHealth?.metrics?.activeAtoms || 0),
      candidateCount: Number(snapshot.summary?.candidateCount || 0),
      flatFamilies: Number(snapshot.summary?.flatFamilies || 0),
      mixedFamilies: Number(snapshot.summary?.mixedFamilies || 0),
      alreadyFolderizedFamilies: Number(snapshot.summary?.alreadyFolderizedFamilies || 0),
      namingFamilies: Number(snapshot.summary?.namingFamilies || 0),
      namingTargets: Number(snapshot.summary?.namingTargets || 0),
      namingDebt: Number(snapshot.summary?.namingTargets || 0),
      dbSyncState: snapshot.summary?.dbSyncState || 'missing',
      summary: snapshot.summary,
      snapshot
    },
    ...history
  ];
}

export async function buildFolderizationSnapshotContext(args = {}, context = {}, overrides = {}) {
  const projectPath = context?.projectPath || null;
  const repo = projectPath ? getRepository(projectPath) : null;
  if (!projectPath || !repo) {
    return {
      success: false,
      error: 'Project repository unavailable'
    };
  }

  const scopePath = args?.scopePath || null;
  const focusPath = args?.focusPath || null;
  const filePaths = normalizeFilePaths(args?.filePaths || []);
  const databaseHealth = args?.includeDatabaseHealth === false
    ? null
    : getDatabaseHealthSummary(repo.db, { liveRowSyncSampleLimit: 5 });
  const liveRowSync = summarizeLiveRowSync(databaseHealth?.metrics?.liveRowSync || null);
  const folderizationOptions = {
    scopePath,
    focusPath,
    filePaths,
    databaseHealthy: databaseHealth?.healthy === true,
    liveRowSyncState: liveRowSync.state
  };

  const folderizationReport = repo
    ? buildFolderizationReportFromRepo(repo, folderizationOptions)
    : buildEmptyFolderizationReport(folderizationOptions);

  const prePersistHistory = loadFolderizationSnapshotHistory(repo.db, {
    projectPath,
    scopePath,
    focusPath,
    limit: args?.historyLimit || 5
  });

  const summary = buildFolderizationSnapshotSummary({
    folderizationReport,
    databaseHealth,
    scopePath,
    focusPath,
    history: prePersistHistory
  });

  const snapshot = {
    projectPath,
    scopePath,
    focusPath,
    filePaths,
    capturedAt: new Date().toISOString(),
    snapshotKind: overrides.snapshotKind || args?.snapshotKind || 'folderization',
    captureSource: overrides.captureSource || args?.captureSource || 'mcp.tool.get_folderization_snapshot',
    folderization: {
      candidateReport: folderizationReport.candidateReport,
      familyState: folderizationReport.familyState,
      migrationPlans: folderizationReport.migrationPlans,
      naming: folderizationReport.naming,
      namingPatterns: folderizationReport.namingPatterns,
      creationGuidance: folderizationReport.creationGuidance,
      propagation: folderizationReport.propagation,
      recommendation: folderizationReport.recommendation,
      drift: folderizationReport.drift || null,
      decision: folderizationReport.decision,
      summary: folderizationReport.summary
    },
    databaseHealth: databaseHealth ? {
      healthy: databaseHealth.healthy === true,
      healthScore: Number(databaseHealth.healthScore || 0),
      healthGrade: databaseHealth.grade || 'F',
      summary: databaseHealth.summary || null,
      metrics: {
        activeAtoms: Number(databaseHealth.metrics?.activeAtoms || 0),
        liveRowSync: databaseHealth.metrics?.liveRowSync || null,
        fileUniverse: databaseHealth.metrics?.fileUniverse || null,
        systemMapCoverage: databaseHealth.metrics?.systemMapCoverage || null,
        semanticSurface: summarizeSemanticSurfaceForSnapshot(databaseHealth.metrics?.semanticSurface)
      },
      criticalFindings: Array.isArray(databaseHealth.criticalFindings) ? databaseHealth.criticalFindings.slice(0, 5) : [],
      warnings: Array.isArray(databaseHealth.warnings) ? databaseHealth.warnings.slice(0, 5) : [],
      recommendations: Array.isArray(databaseHealth.recommendations) ? databaseHealth.recommendations.slice(0, 5) : []
    } : null,
    summary
  };

  snapshot.snapshotFingerprint = buildFolderizationSnapshotFingerprint(snapshot);
  snapshot.trend = summary.trend;

  const persisted = args?.persist !== false
    ? persistFolderizationSnapshot(repo.db, snapshot)
    : null;
  const history = buildHistoryWithCurrent(snapshot, prePersistHistory);

  return {
    success: true,
    projectPath,
    repo,
    folderizationReport,
    databaseHealth,
    snapshot: {
      ...snapshot,
      history
    },
    history,
    trend: summary.trend,
    persisted
  };
}

export default { buildFolderizationSnapshotContext };
