import {
  getFileUniverseGranularity,
  getMetadataSurfaceParity,
  getSemanticSurfaceGranularity,
  getSystemMapPersistenceCoverage,
  discoverProjectSourceFiles,
  repairSystemMapPersistenceCoverage,
  summarizePersistedScannedFileCoverage,
  syncPersistedScannedFileManifest,
  ensureLiveRowSync,
  getLiveFileTotal
} from '../../shared/compiler/index.js';

const PROJECT_WIDE_FILE = 'project-wide';
const ISSUE_TYPE_PREFIX = 'runtime_table_health';
const TABLE_HEALTH_CHECKS = [
  {
    table: 'atoms',
    minRows: 100,
    severity: 'high',
    message: 'atoms is below minimum expected rows; the indexing pipeline likely did not complete.'
  },
  {
    table: 'atom_relations',
    minRows: 1,
    severity: 'high',
    message: 'atom_relations is empty; the graph/linking pipeline is not persisting dependencies.'
  },
  {
    table: 'files',
    minRows: 1,
    severity: 'high',
    message: 'files is empty; file-level metadata is missing.'
  },
  {
    table: 'atom_versions',
    minRows: 1,
    severity: 'medium',
    message: 'atom_versions is empty; version tracking is not being written.'
  },
  {
    table: 'atom_events',
    minRows: 1,
    severity: 'medium',
    message: 'atom_events is empty; event sourcing is not being written.'
  },
  {
    table: 'societies',
    minRows: 1,
    severity: 'medium',
    message: 'societies is empty; society clustering is not being persisted.'
  },
  {
    table: 'risk_assessments',
    minRows: 1,
    severity: 'medium',
    message: 'risk_assessments is empty; risk telemetry is advisory only until persistence resumes.'
  }
];

function buildTableIssueType(table) {
  return `${ISSUE_TYPE_PREFIX}_${table}_empty`;
}

function buildKnownIssueTypes() {
  return [
    ...TABLE_HEALTH_CHECKS.map((check) => buildTableIssueType(check.table)),
    `${ISSUE_TYPE_PREFIX}_semantic_surface_drift`,
    `${ISSUE_TYPE_PREFIX}_live_row_drift`,
    `${ISSUE_TYPE_PREFIX}_metadata_surface_parity`,
    `${ISSUE_TYPE_PREFIX}_system_map_persistence`,
    `${ISSUE_TYPE_PREFIX}_file_universe_drift`
  ];
}

function getPhase2PendingFiles(db) {
  try {
    return db.prepare('SELECT COUNT(DISTINCT file_path) as total FROM atoms WHERE is_phase2_complete = 0').get()?.total || 0;
  } catch {
    return 0;
  }
}

function loadTableCount(db, table) {
  const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
  const hasSoftDelete = Array.isArray(columns) && columns.some((column) => column?.name === 'is_removed');
  const whereClause = hasSoftDelete ? 'WHERE (is_removed IS NULL OR is_removed = 0)' : '';
  const row = db.prepare(`SELECT COUNT(*) as total FROM "${table}" ${whereClause}`).get();
  return Number(row?.total || 0);
}

export function buildRuntimeHealthIssues(db) {
  const tableCounts = {};
  const issues = [];
  const phase2PendingFiles = getPhase2PendingFiles(db);

  for (const check of TABLE_HEALTH_CHECKS) {
    const total = loadTableCount(db, check.table);
    tableCounts[check.table] = total;
    if (total >= check.minRows) continue;

    issues.push({
      issueType: buildTableIssueType(check.table),
      severity: check.severity,
      message: check.message,
      context: {
        source: 'runtime_table_health',
        category: 'table_health',
        table: check.table,
        rows: total,
        minRows: check.minRows
      }
    });
  }

  let semanticSurfaceGranularity = getSemanticSurfaceGranularity(db);
  if (semanticSurfaceGranularity.materiallyDrifting === true && phase2PendingFiles === 0) {
    const repairResult = repairSystemMapPersistenceCoverage(db);
    if (repairResult?.repaired === true) {
      semanticSurfaceGranularity = getSemanticSurfaceGranularity(db);
    }
  }

  if (semanticSurfaceGranularity.materiallyDrifting === true) {
    issues.push({
      issueType: `${ISSUE_TYPE_PREFIX}_semantic_surface_drift`,
      severity: 'medium',
      message: `semantic_connections (${semanticSurfaceGranularity.fileLevel.total}) is drifting from the canonical semantic summary derived from atom semantic metadata (${semanticSurfaceGranularity.legacyView.total}).`,
      context: {
        source: 'runtime_table_health',
        category: 'semantic_surface_granularity',
        fileLevel: semanticSurfaceGranularity.fileLevel,
        atomLevel: semanticSurfaceGranularity.atomLevel,
        contract: semanticSurfaceGranularity.contract,
        materialIssues: semanticSurfaceGranularity.materialIssues,
        advisories: semanticSurfaceGranularity.advisories,
        issues: semanticSurfaceGranularity.issues
      }
    });
  }

  const liveRowSync = ensureLiveRowSync(db, { autoSync: true, sampleLimit: 5 });
  const staleAtomRows = Number(liveRowSync?.summary?.staleAtomRows || 0);
  const staleFileRows = Number(liveRowSync?.summary?.staleFileRows || 0);
  const staleRiskRows = Number(liveRowSync?.summary?.staleRiskRows || 0);
  const staleRelationRows = Number(liveRowSync?.summary?.staleRelationRows || 0);
  const staleConnectionRows = Number(liveRowSync?.summary?.staleConnectionRows || 0);
  if (staleAtomRows > 0 || staleFileRows > 0 || staleRiskRows > 0 || staleRelationRows > 0 || staleConnectionRows > 0) {
    issues.push({
      issueType: `${ISSUE_TYPE_PREFIX}_live_row_drift`,
      severity: (staleAtomRows > 0 || staleFileRows > 0) ? 'high' : 'medium',
      message: `Live support tables are drifting from the atom graph (${staleAtomRows} stale atom rows, ${staleFileRows} stale file rows, ${staleRiskRows} stale risk rows, ${staleRelationRows} stale call rows, ${staleConnectionRows} stale semantic rows).`,
      context: {
        source: 'runtime_table_health',
        category: 'live_row_sync',
        summary: liveRowSync.summary,
        recommendedActions: liveRowSync.before?.recommendedActions || []
      }
    });
  }

  return {
    issues,
    tableCounts,
    semanticSurfaceGranularity,
    liveRowSync
  };
}

export async function buildDeepRuntimeHealthIssues(projectPath, db) {
  const issues = [];
  const phase2PendingFiles = getPhase2PendingFiles(db);

  const metadataSurfaceParity = getMetadataSurfaceParity(db);
  if (metadataSurfaceParity.healthy === false) {
    issues.push({
      issueType: `${ISSUE_TYPE_PREFIX}_metadata_surface_parity`,
      severity: 'medium',
      message: `Primary and mirrored file metadata surfaces are drifting (imports parity ${Math.round(metadataSurfaceParity.importsParityRatio * 100)}%, exports parity ${Math.round(metadataSurfaceParity.exportsParityRatio * 100)}%).`,
      context: {
        source: 'runtime_table_health',
        category: 'metadata_surface_parity',
        parity: metadataSurfaceParity
      }
    });
  }

  const systemMapPersistenceCoverage = getSystemMapPersistenceCoverage(db);
  let effectiveSystemMapPersistenceCoverage = systemMapPersistenceCoverage;
  if (systemMapPersistenceCoverage.healthy === false && phase2PendingFiles === 0) {
    const repairResult = repairSystemMapPersistenceCoverage(db);
    if (repairResult.repaired === true) {
      effectiveSystemMapPersistenceCoverage = getSystemMapPersistenceCoverage(db);
    }
  }

  if (effectiveSystemMapPersistenceCoverage.healthy === false) {
    issues.push({
      issueType: `${ISSUE_TYPE_PREFIX}_system_map_persistence`,
      severity: 'medium',
      message: 'system_files/file_dependencies are disconnected from the primary file metadata surface.',
      context: {
        source: 'runtime_table_health',
        category: 'system_map_persistence',
        coverage: effectiveSystemMapPersistenceCoverage
      }
    });
  }

  if (projectPath) {
    const scannedFilePaths = await discoverProjectSourceFiles(projectPath);
    if (phase2PendingFiles === 0) {
      await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);
    }
    const persistedFileCoverage = await summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths);
    const liveFileCount = getLiveFileTotal(db);
    const fileUniverseGranularity = getFileUniverseGranularity({
      scannedFileTotal: persistedFileCoverage.scannedFileTotal,
      manifestFileTotal: persistedFileCoverage.manifestFileTotal,
      liveFileCount
    });

    if (fileUniverseGranularity.healthy === false || persistedFileCoverage.synchronized === false) {
      issues.push({
        issueType: `${ISSUE_TYPE_PREFIX}_file_universe_drift`,
        severity: 'high',
        message: `Scanner, manifest and live file universes are not aligned (${persistedFileCoverage.missingFileCount} missing manifest rows, ${fileUniverseGranularity.zeroAtomFileCount} zero-atom file rows).`,
        context: {
          source: 'runtime_table_health',
          category: 'file_universe_granularity',
          persistedFileCoverage,
          fileUniverseGranularity
        }
      });
    }
  }

  return issues;
}

export function getRuntimeHealthIssueTypes() {
  return buildKnownIssueTypes();
}
