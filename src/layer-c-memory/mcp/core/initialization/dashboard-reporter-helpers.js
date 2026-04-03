import { getRepositoryDiagnostics } from '#layer-c/storage/repository/index.js';
import { getDatabaseHealthSummary, getSystemMapPersistenceCoverage, buildUpdateSurfaceSummary } from '#shared/compiler/index.js';

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

export function resolveDashboardHeader(isFinal, isSettling) {
  if (isFinal) return 'FINAL SYSTEM SUMMARY (bootstrap snapshot)';
  return isSettling ? 'PRELIMINARY SYSTEM SUMMARY' : 'SYSTEM SUMMARY';
}

export function buildDashboardDetailLines(extendedMetrics, { isFinal, isPreliminary, isSettling, fileUniverseSettling }) {
  const detailLines = [];

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
    extendedMetrics.healthPanel?.oneLine
      ? `  Health Panel: ${extendedMetrics.healthPanel.oneLine}`
      : null,
    `  Physics Coverage: ${extendedMetrics.physicsCoverage}% signals (${extendedMetrics.hotspots} hotspots)`,
    ...(isFinal
      ? ['  Final snapshot advisory: this is a bootstrap snapshot; use get_server_status() for the live runtime view.']
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
