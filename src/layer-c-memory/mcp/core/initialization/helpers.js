import { getRepositoryDiagnostics } from '../../../storage/repository/index.js';
import { buildMcpUrl } from '../../../../shared/mcp-endpoints.js';
import {
  getDatabaseHealthSummary,
  getSystemMapPersistenceCoverage,
  buildStatusSummaryPayload,
  buildUpdateSurfaceSummary
} from '../../../../shared/compiler/index.js';

function getGraphDependencyTotal(db) {
  if (!db?.prepare) return 0;
  try {
    const row = db.prepare('SELECT COUNT(*) AS total FROM file_dependencies WHERE (is_removed IS NULL OR is_removed = 0)').get();
    return Number(row?.total) || 0;
  } catch {
    return 0;
  }
}

export function buildBootstrapUpdateSurface({
  projectPath,
  db,
  repo,
  liveRowSyncSummary,
  fileUniverseSummary,
  phase2PendingFiles
}) {
  const repositoryDiagnostics = projectPath ? getRepositoryDiagnostics(projectPath) : null;
  const repositoryDb = repositoryDiagnostics?.status?.repo?.db || null;
  const databaseHealth = repositoryDb ? getDatabaseHealthSummary(repositoryDb) : null;
  const systemMapPersistenceCoverage = repositoryDb ? getSystemMapPersistenceCoverage(repositoryDb) : null;
  const liveFileCount = fileUniverseSummary?.liveFileCount || 0;
  const bootstrapStatus = {
    repository: {
      status: repositoryDiagnostics?.status || {
        dbOpen: !!db?.open,
        journal: { queued: 0 }
      },
      integrity: repositoryDiagnostics?.integrity || null,
      systemMapPersistenceCoverage
    },
    databaseHealth,
    metadata: {
      liveFileCount,
      phase2PendingFiles,
      phase2CompletedFiles: fileUniverseSummary?.liveFileCount || 0
    },
    watcher: {
      isRunning: true,
      pendingChanges: 0,
      failedChanges: 0,
      lastChangeOrigin: 'bootstrap'
    },
    cache: {
      files: liveFileCount,
      status: liveRowSyncSummary || 'bootstrap'
    },
    background: {
      graphCoverage: {
        dependenciesTotal: repo?.db ? getGraphDependencyTotal(repo.db) : 0
      }
    }
  };

  return buildUpdateSurfaceSummary(bootstrapStatus);
}

export function buildBootstrapStatusPayload({
  projectPath,
  db,
  liveRowSyncSummary,
  fileUniverseSummary,
  phase2PendingFiles,
  metrics,
  startupTelemetry,
  compilerDiagnostics,
  sessionSummary
}) {
  return buildStatusSummaryPayload({
    initialized: true,
    initializing: false,
    project: projectPath,
    telemetryMode: 'fast_phase2',
    timestamp: new Date().toISOString(),
    databaseHealth: compilerDiagnostics?.databaseHealth || null,
    repository: {
      status: {
        dbOpen: !!db?.open,
        ready: true,
        initialized: true,
        projectPath
      },
      integrity: liveRowSyncSummary || null
    },
    watcher: {
      isRunning: true,
      pendingChanges: 0,
      failedChanges: 0,
      lastChangeOrigin: 'bootstrap'
    },
    metadata: {
      totalFiles: compilerDiagnostics?.totalFiles || 0,
      totalFunctions: compilerDiagnostics?.totalFunctions || 0,
      lastAnalyzed: compilerDiagnostics?.lastAnalyzed || null,
      liveAtomCount: metrics?.totalAtoms || 0,
      liveFileCount: compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
      phase2PendingFiles,
      phase2CompletedFiles: compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
      societiesCount: compilerDiagnostics?.societiesCount || 0
    },
    cache: {
      atoms: metrics?.totalAtoms || 0,
      files: compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
      relations: metrics?.callLinks || 0,
      status: liveRowSyncSummary || 'bootstrap'
    },
    background: {
      phase2PendingFiles,
      phase2CompletedFiles: compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
      societiesCount: compilerDiagnostics?.societiesCount || 0,
      graphCoverage: {
        filesTotal: compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
        dependenciesTotal: metrics?.callLinks || 0,
        coverageRatio: metrics?.liveCoverageRatio || 0,
        callGraphLinks: metrics?.callLinks || 0
      },
      fileUniverseSummary: fileUniverseSummary || null,
      conceptualDuplicates: {
        actionableGroups: metrics?.conceptualGroups || 0,
        rawGroups: metrics?.conceptualRawGroups || 0,
        actionableRatio: metrics?.conceptualActionableRatio || 0
      },
      issueSummary: metrics?.issueSummary || '0 items',
      mcpSessionSummary: sessionSummary || null
    },
    mcpSessions: sessionSummary || null,
    compilerExplainability: compilerDiagnostics || null,
    metricsSnapshot: metrics?.metricsSnapshot || null,
    healthSnapshot: metrics?.healthSnapshot || null,
    healthPanel: metrics?.healthPanel || null,
    systemInventory: metrics?.systemInventory || null,
    canonicalPromotion: metrics?.metricsSnapshot?.current?.canonicalPromotion || null,
    cachePolicy: metrics?.metricsSnapshot?.current?.cachePolicy || null,
    toolInventory: metrics?.toolInventory || null,
    updateSurface: metrics?.updateSurface || null,
    surfaceAudit: compilerDiagnostics?.surfaceAudit || null,
    signalConfidence: compilerDiagnostics?.signalConfidence || null
  }, []);
}

export function buildBootstrapDiagnosticsFallbackSummary(extendedMetrics, { isFinal, snapshotKind }) {
  const startupSummary = extendedMetrics?.startupTelemetry?.summary
    || extendedMetrics?.statusPayload?.summary
    || 'startup telemetry unavailable';
  const inventorySummary = extendedMetrics?.systemInventory?.summaryText
    || extendedMetrics?.statusPayload?.systemInventory?.summaryText
    || 'system inventory unavailable';
  const toolSummary = extendedMetrics?.toolInventory?.summaryText
    || extendedMetrics?.statusPayload?.toolInventory?.summaryText
    || 'tool inventory unavailable';
  const updateSummary = extendedMetrics?.updateSurface?.detail
    || extendedMetrics?.statusPayload?.updateSurface?.detail
    || 'update surface unavailable';
  const healthSummary = extendedMetrics?.healthPanel?.oneLine
    || extendedMetrics?.statusPayload?.healthPanel?.oneLine
    || extendedMetrics?.statusPayload?.summary
    || 'health summary unavailable';

  return [
    'OMNYSYS PIPELINE INTEGRITY REPORT',
    `Summary: ${snapshotKind}${isFinal ? ' final' : ''} snapshot fallback`,
    `Startup: ${startupSummary}`,
    `Health: ${healthSummary}`,
    `System Inventory: ${inventorySummary}`,
    `Tool Inventory: ${toolSummary}`,
    `Update: ${updateSummary}`
  ].join('\n');
}

export function resolveDashboardHeader(isFinal, isSettling, snapshotKind = 'bootstrap') {
  if (isFinal) {
    return snapshotKind === 'phase2-completion'
      ? 'FINAL SYSTEM SUMMARY (phase2 completion snapshot)'
      : 'FINAL SYSTEM SUMMARY (bootstrap snapshot)';
  }
  return isSettling ? 'PRELIMINARY SYSTEM SUMMARY' : 'SYSTEM SUMMARY';
}

export function buildDashboardDetailLines(extendedMetrics, { isFinal, isPreliminary, isSettling, fileUniverseSettling, snapshotKind = 'bootstrap' }) {
  const detailLines = [];
  const systemTableRows = extendedMetrics.statusPayload?.systemTable?.rows || [];
  const mcpHttpUrl = buildMcpUrl({ port: 9999 });

  if (isPreliminary && isSettling) {
    detailLines.push('  Preliminary snapshot: Phase 2 telemetry is still settling; final debt counts may change.', '');
  }

  detailLines.push(
    `  Project: ${extendedMetrics.totalAtoms} atoms (${extendedMetrics.typeSummary})`,
    `  Callable Atoms: ${extendedMetrics.callableSummary}`,
    fileUniverseSettling
      ? '  File Universe: settling during bootstrap; live coverage will appear after manifest/live index converge'
      : `  File Universe: ${Math.round(extendedMetrics.liveCoverageRatio * 100)}% live coverage (${extendedMetrics.zeroAtomFileCount} zero-atom files expected)`,
    `  MCP Sessions: ${extendedMetrics.mcpSessionSummary.summary}`,
    extendedMetrics.startupTelemetry
      ? `  Startup: ${extendedMetrics.startupTelemetry.state} | ${extendedMetrics.startupTelemetry.summary} | layerA=${extendedMetrics.startupTelemetry.layerAStrategy || 'n/a'}`
      : null,
    `  MCP HTTP: listening at ${mcpHttpUrl} | port=9999 | transport=${extendedMetrics.startupTelemetry?.proxyManaged ? 'proxy-managed' : 'standalone'}`,
    `  Graph Coverage: call graph=${extendedMetrics.callLinks} links, semantic layer=${extendedMetrics.semanticLinks} high-level links`,
    `  Duplicates: ${extendedMetrics.structuralGroups} structural groups, ${extendedMetrics.conceptualGroups} conceptual actionable groups (${extendedMetrics.conceptualRawGroups} raw groups)` +
      (extendedMetrics.conceptualImplementations > 0
        ? ` | implementations=${extendedMetrics.conceptualImplementations} actionable (${extendedMetrics.conceptualRawImplementations} raw)`
        : extendedMetrics.conceptualCandidates > 0
          ? ` | candidates=${extendedMetrics.conceptualCandidates}`
          : ''),
    extendedMetrics.conceptualRawGroups > 0
      ? `  Conceptual Signal: actionable/raw ratio=${Math.round(extendedMetrics.conceptualActionableRatio * 100)}%`
      : null,
    ((extendedMetrics.conceptualNoiseByClass.expected_repeat || 0) + (extendedMetrics.conceptualNoiseByClass.low_signal || 0)) > 0
      ? `  Conceptual noise filtered: expected_repeat=${extendedMetrics.conceptualNoiseByClass.expected_repeat || 0}, low_signal=${extendedMetrics.conceptualNoiseByClass.low_signal || 0}`
      : null,
    `  Technical Debt: ${extendedMetrics.issueSummary}${extendedMetrics.orphans > 0 ? ` (+${extendedMetrics.orphans} orphans)` : ''}`,
    extendedMetrics.updateSurface
      ? `  Update: ${extendedMetrics.updateSurface.state} | ${extendedMetrics.updateSurface.detail}`
      : null,
    extendedMetrics.metricsSnapshot
      ? `  Metrics Snapshot: ${extendedMetrics.metricsSnapshot.summary}`
      : null,
    extendedMetrics.systemInventory?.summaryText
      ? `  System Inventory: ${extendedMetrics.systemInventory.summaryText}`
      : null,
    extendedMetrics.toolInventory?.summaryText
      ? `  Tool Inventory: ${extendedMetrics.toolInventory.summaryText}`
      : null,
    extendedMetrics.healthPanel?.oneLine
      ? `  Health Panel: ${extendedMetrics.healthPanel.oneLine}`
      : null,
    systemTableRows.length > 0
      ? `  Control Plane: ${systemTableRows.map((row) => `${row.area}=${row.state}`).join(' | ')}`
      : null,
    systemTableRows.length > 0
      ? `  Control Plane Detail: ${systemTableRows.slice(0, 8).map((row) => `${row.area}:${row.detail}`).join(' || ')}`
      : null,
    `  Physics Coverage: ${extendedMetrics.physicsCoverage}% signals (${extendedMetrics.hotspots} hotspots)`,
    ...(isFinal
      ? [snapshotKind === 'phase2-completion'
          ? '  Final snapshot advisory: this is a post-Phase 2 reconciliation snapshot; use get_server_status() for the live runtime view.'
          : '  Final snapshot advisory: this is a bootstrap snapshot; use get_server_status() for the live runtime view.']
      : []),
    ...(isSettling
      ? ['  Snapshot Advisory: startup/bootstrap metrics may still be reconciling; prefer get_server_status() for the final live view']
      : []),
    ''
  );

  return detailLines.filter(Boolean);
}

export function insertDashboardDetailLines(lines, detailLines) {
  let insertIdx = lines.findIndex((line) => line.includes('CRITICAL ISSUES'));
  if (insertIdx === -1) insertIdx = lines.findIndex((line) => line.includes('TOP RECOMMENDATIONS'));
  if (insertIdx === -1) insertIdx = lines.length - 2;

  lines.splice(insertIdx, 0, ...detailLines);
}
