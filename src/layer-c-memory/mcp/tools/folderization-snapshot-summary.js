import { buildFolderizationSnapshotTrend } from './folderization-snapshot-helpers.js';
import { buildCompilerDriftAssessment } from '../../../shared/compiler/compiler-drift-assessment.js';
import {
  buildDataGatewayContract,
  summarizeDataGatewayContract
} from '../../../shared/compiler/index.js';
import { summarizeSemanticCanonicality } from '../../../shared/compiler/semantic-surface-granularity-contract.js';

/**
 * Trunca semanticSurface para el snapshot, eliminando vistas legacy redundantes
 * que ya están en la DB (semantic_connections + atoms.semantic_metadata).
 * Mantiene solo resúmenes y contract para diagnóstico.
 */
export function summarizeSemanticSurfaceForSnapshot(semanticSurface) {
  if (!semanticSurface) return null;

  const canonicality = summarizeSemanticCanonicality(semanticSurface);

  return {
    fileLevel: semanticSurface.fileLevel,
    atomLevel: semanticSurface.atomLevel,
    contract: semanticSurface.contract,
    healthy: semanticSurface.healthy,
    materiallyDrifting: semanticSurface.materiallyDrifting,
    materialIssues: semanticSurface.materialIssues || [],
    advisories: semanticSurface.advisories || [],
    canonicality
  };
}

function countLiveRowSyncStaleRows(liveRowSync) {
  return (
    Number(liveRowSync?.summary?.staleAtomRows || 0) +
    Number(liveRowSync?.summary?.staleFileRows || 0) +
    Number(liveRowSync?.summary?.staleRiskRows || 0) +
    Number(liveRowSync?.summary?.staleRelationRows || 0) +
    Number(liveRowSync?.summary?.staleConnectionRows || 0)
  );
}

function buildMissingLiveRowSyncSummary(dataGatewaySummary = null) {
  return {
    state: dataGatewaySummary?.primaryIssue?.state || 'missing',
    healthy: false,
    trustworthy: false,
    staleRows: 0,
    reason: dataGatewaySummary?.primaryIssue?.reason || 'No live row sync summary is available.',
    recommendation: dataGatewaySummary?.nextAction || 'Reconcile the live support tables before trusting folderization guidance.',
    gatewaySummary: dataGatewaySummary
  };
}

function buildLiveRowSyncSummary({ liveRowSync, liveRowSignal, staleRows, dataGatewaySummary }) {
  const hasCleanupError = liveRowSync.cleanupError != null;
  const isSettling = liveRowSync.skippedReason === 'phase2_settling';
  const state = liveRowSignal?.state
    || dataGatewaySummary?.primaryIssue?.state
    || (hasCleanupError
      ? 'blocked'
      : isSettling
        ? 'partial'
        : staleRows > 0
          ? 'stale'
          : 'fresh');
  const healthy = liveRowSignal?.healthy === true || (!hasCleanupError && staleRows === 0);
  const trustworthy = liveRowSignal?.trustworthy === true || (!hasCleanupError && staleRows === 0);
  const reason = liveRowSignal?.reason
    || dataGatewaySummary?.primaryIssue?.reason
    || liveRowSync.cleanupError?.message
    || (staleRows > 0 ? 'Live support tables are drifting from the atom graph.' : 'Live support tables are aligned with the atom graph.');
  const recommendation = liveRowSignal?.recommendation
    || dataGatewaySummary?.nextAction
    || liveRowSync.before?.recommendedActions?.[0]
    || (staleRows > 0 ? 'Reconcile the live support tables before trusting folderization guidance.' : 'Keep live-row reconciliation on the canonical path.');

  return {
    state,
    healthy,
    trustworthy,
    staleRows,
    reason,
    recommendation,
    evidence: liveRowSignal?.evidence || liveRowSync,
    assessment: liveRowSignal,
    gatewaySummary: dataGatewaySummary
  };
}

export function summarizeLiveRowSync(liveRowSync = null, dataGatewaySummary = null) {
  if (!liveRowSync) {
    return buildMissingLiveRowSyncSummary(dataGatewaySummary);
  }

  const assessment = buildCompilerDriftAssessment({ liveRowSync });
  const liveRowSignal = Array.isArray(assessment?.signals)
    ? assessment.signals.find((signal) => signal?.key === 'live_row_sync') || null
    : null;
  const staleRows = countLiveRowSyncStaleRows(liveRowSync);
  return buildLiveRowSyncSummary({ liveRowSync, liveRowSignal, staleRows, dataGatewaySummary });
}

export function buildFolderizationSnapshotSummary({
  folderizationReport = null,
  databaseHealth = null,
  scopePath = null,
  focusPath = null,
  history = []
} = {}) {
  const summary = folderizationReport?.summary || {};
  const creationGuidance = folderizationReport?.creationGuidance || {};
  const dataGatewayContract = buildDataGatewayContract({ databaseHealth });
  const dataGatewaySummary = summarizeDataGatewayContract(dataGatewayContract);
  const liveRowSync = summarizeLiveRowSync(
    databaseHealth?.metrics?.liveRowSync || null,
    dataGatewaySummary
  );
  const trend = buildFolderizationSnapshotTrend({ summary: { ...summary, dbSyncState: liveRowSync.state } }, history);
  const folderizationDrift = folderizationReport?.drift || {
    state: liveRowSync.state,
    score: liveRowSync.state === 'blocked' ? 100 : liveRowSync.state === 'stale' ? 50 : 0,
    reason: liveRowSync.reason || null,
    recommendation: liveRowSync.recommendation || null,
    evidence: liveRowSync.evidence || null
  };
  const recommendation = folderizationReport?.recommendation || {};
  const preferredFolder = creationGuidance.preferredFolder || creationGuidance.preferredDirectory || null;
  const preferredRoleStems = Array.isArray(creationGuidance.preferredRoleStems)
    ? creationGuidance.preferredRoleStems
    : [];
  const nextBestStem = preferredRoleStems[0]?.stem || 'core.js';
  const recommendedTool = liveRowSync.state !== 'fresh'
    ? null
    : recommendation.strategy === 'split_large_file'
      ? 'split_large_file'
      : preferredFolder
        ? 'folderize_family'
        : null;
  const recommendedAction = liveRowSync.state !== 'fresh'
    ? liveRowSync.recommendation
    : preferredFolder
      ? `${creationGuidance.selectionReason || 'Reuse the closest DB-backed family.'} Create the next file inside ${preferredFolder} using ${nextBestStem}.`
      : recommendation.action
        || (recommendation.strategy === 'split_large_file'
          ? 'Use split_large_file to decompose the monolith before folderizing.'
          : 'Use role-only basenames and create the next helper under the closest folderized family, keeping the barrel at index.js.');
  const whyThisFirst = liveRowSync.state !== 'fresh'
    ? liveRowSync.reason
    : recommendation.strategy === 'split_large_file'
      ? recommendation.message || 'The current family is monolithic; split it before folderizing.'
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
    recommendedTool,
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

export function buildHistoryWithCurrent(snapshot = null, history = []) {
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
