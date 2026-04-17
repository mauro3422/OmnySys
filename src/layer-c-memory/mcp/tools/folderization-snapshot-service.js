/**
 * Shared service for building lightweight folderization snapshots.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  buildFolderizationSnapshotFingerprint,
  loadFolderizationSnapshotHistory,
  persistFolderizationSnapshot
} from './folderization-snapshot/index.js';
import {
  buildFolderizationSnapshotSummary,
  buildHistoryWithCurrent,
  summarizeSemanticSurfaceForSnapshot
} from './folderization-snapshot/summary.js';

async function loadFreshFolderizationReportBuilder() {
  const reportBuilderUrl = pathToFileURL(
    path.resolve(process.cwd(), 'src/shared/compiler/folderization-report/report-builder.js')
  );
  reportBuilderUrl.searchParams.set('rev', randomUUID());
  reportBuilderUrl.searchParams.set('call', `${Date.now()}`);
  return import(reportBuilderUrl.href);
}

async function loadFreshDatabaseHealthSummary() {
  const databaseHealthUrl = pathToFileURL(
    path.resolve(process.cwd(), 'src/shared/compiler/database-health-summary.js')
  );
  databaseHealthUrl.searchParams.set('rev', randomUUID());
  databaseHealthUrl.searchParams.set('call', `${Date.now()}`);
  return import(databaseHealthUrl.href);
}

function normalizeFilePaths(filePaths = []) {
  return Array.isArray(filePaths)
    ? filePaths.map((filePath) => String(filePath || '').trim()).filter(Boolean)
    : [];
}

function buildReconciledFolderizationReport(folderizationReport = {}) {
  const candidateReport = folderizationReport?.candidateReport || null;
  const topCandidate = Array.isArray(candidateReport?.topCandidates)
    ? candidateReport.topCandidates[0] || null
    : null;

  if (!topCandidate?.recommendedFolder) {
    return folderizationReport;
  }

  const creationGuidance = folderizationReport?.creationGuidance || {};
  const preferredFolder = topCandidate.recommendedFolder;
  const selectionReason = `Top folderization candidate from the DB is ${topCandidate.familyRoot} in ${topCandidate.directory}.`;
  const reconciledCreationGuidance = {
    ...creationGuidance,
    mode: 'create_folderized_family',
    matchedBy: 'candidateReport',
    familyDomain: topCandidate.directory || creationGuidance.familyDomain || null,
    selectionReason,
    preferredFolder,
    preferredFamilyRoot: topCandidate.familyRoot || creationGuidance.preferredFamilyRoot || null,
    preferredDirectory: topCandidate.directory || creationGuidance.preferredDirectory || null,
    guidance: `${selectionReason} Create the next file inside ${preferredFolder} using a short role basename such as ${(creationGuidance.preferredRoleStems || [])[0]?.stem || 'core.js'}.`
  };

  return {
    ...folderizationReport,
    creationGuidance: reconciledCreationGuidance
  };
}

function reconcileFolderizationSnapshotSummary(summary = {}, folderizationReport = {}) {
  const candidateReport = folderizationReport?.candidateReport || null;
  const topCandidate = Array.isArray(candidateReport?.topCandidates)
    ? candidateReport.topCandidates[0] || null
    : null;

  if (!topCandidate?.recommendedFolder) {
    return summary;
  }

  const preferredFolder = topCandidate.recommendedFolder;
  const selectionReason = `Top folderization candidate from the DB is ${topCandidate.familyRoot} in ${topCandidate.directory}.`;
  const recommendedAction = `Folderize ${topCandidate.familyRoot} into ${preferredFolder} (confidence ${topCandidate.confidence}).`;

  return {
    ...summary,
    recommendedTool: 'folderize_family',
    recommendedAction,
    nextBestFolder: preferredFolder,
    creationNextBestFolder: preferredFolder,
    whyThisFirst: selectionReason,
    folderizationTargetFolder: preferredFolder,
    folderizationTargetReason: selectionReason,
    creationGuidanceFolder: preferredFolder,
    creationGuidanceReason: selectionReason,
    summaryText: String(summary.summaryText || '')
      .replace(/target=[^|]+/, `target=${preferredFolder}`)
  };
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

  const [
    { buildFolderizationReportFromRepo, buildEmptyFolderizationReport },
    { getDatabaseHealthSummary }
  ] = await Promise.all([
    loadFreshFolderizationReportBuilder(),
    loadFreshDatabaseHealthSummary()
  ]);

  const scopePath = args?.scopePath || null;
  const focusPath = args?.focusPath || null;
  const filePaths = normalizeFilePaths(args?.filePaths || []);
  const databaseHealth = args?.includeDatabaseHealth === false
    ? null
    : getDatabaseHealthSummary(repo.db, { liveRowSyncSampleLimit: 5 });
  const liveRowSync = databaseHealth?.metrics?.liveRowSync || null;
  const folderizationOptions = {
    scopePath,
    focusPath,
    filePaths,
    databaseHealthy: databaseHealth?.healthy === true,
    liveRowSyncState: liveRowSync?.state || 'missing'
  };

  const folderizationReport = repo
    ? buildFolderizationReportFromRepo(repo, folderizationOptions)
    : buildEmptyFolderizationReport(folderizationOptions);
  const reconciledFolderizationReport = buildReconciledFolderizationReport(folderizationReport);

  const prePersistHistory = loadFolderizationSnapshotHistory(repo.db, {
    projectPath,
    scopePath,
    focusPath,
    limit: args?.historyLimit || 5
  });

  const summary = reconcileFolderizationSnapshotSummary(
    buildFolderizationSnapshotSummary({
      folderizationReport: reconciledFolderizationReport,
      databaseHealth,
      scopePath,
      focusPath,
      history: prePersistHistory
    }),
    reconciledFolderizationReport
  );

  const snapshot = {
    projectPath,
    scopePath,
    focusPath,
    filePaths,
    capturedAt: new Date().toISOString(),
    snapshotKind: overrides.snapshotKind || args?.snapshotKind || 'folderization',
    captureSource: overrides.captureSource || args?.captureSource || 'mcp.tool.get_folderization_snapshot',
    folderization: {
      candidateReport: reconciledFolderizationReport.candidateReport,
      familyState: reconciledFolderizationReport.familyState,
      migrationPlans: reconciledFolderizationReport.migrationPlans,
      naming: reconciledFolderizationReport.naming,
      namingPatterns: reconciledFolderizationReport.namingPatterns,
      creationGuidance: reconciledFolderizationReport.creationGuidance,
      propagation: reconciledFolderizationReport.propagation,
      recommendation: reconciledFolderizationReport.recommendation,
      drift: reconciledFolderizationReport.drift || null,
      decision: reconciledFolderizationReport.decision,
      summary: reconciledFolderizationReport.summary
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
