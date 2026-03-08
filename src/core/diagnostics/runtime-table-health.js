import { createLogger } from '../../utils/logger.js';
import { getWatcherIssueDb } from '../file-watcher/watcher-issue-repository.js';
import {
  clearWatcherIssueRecord,
  upsertWatcherIssueRecord
} from '../file-watcher/watcher-issue-persistence.js';
import {
  getSemanticSurfaceGranularity,
  ensureLiveRowSync,
  getLiveFileTotal,
  getMetadataSurfaceParity,
  getSystemMapPersistenceCoverage,
  repairSystemMapPersistenceCoverage,
  getFileUniverseGranularity,
  discoverProjectSourceFiles,
  summarizePersistedScannedFileCoverage,
  syncPersistedScannedFileManifest
} from '../../shared/compiler/index.js';

const logger = createLogger('OmnySys:runtime:table-health');

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

function loadTableCount(db, table) {
  const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
  const hasSoftDelete = Array.isArray(columns) && columns.some((column) => column?.name === 'is_removed');
  const whereClause = hasSoftDelete ? 'WHERE (is_removed IS NULL OR is_removed = 0)' : '';
  const row = db.prepare(`SELECT COUNT(*) as total FROM "${table}" ${whereClause}`).get();
  return Number(row?.total || 0);
}

async function buildDeepRuntimeHealthIssues(projectPath, db) {
  const issues = [];

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
  if (systemMapPersistenceCoverage.healthy === false) {
    const repairResult = repairSystemMapPersistenceCoverage(db);
    if (repairResult.repaired === true) {
      effectiveSystemMapPersistenceCoverage = getSystemMapPersistenceCoverage(db);
      if (effectiveSystemMapPersistenceCoverage.healthy === true) {
        logger.warn(`[RUNTIME TABLE HEALTH] repaired system-map dependency coverage (${repairResult.inserted} dependencies across ${repairResult.sources} source files).`);
      }
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
    await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);
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

function buildRuntimeHealthIssues(db) {
  const tableCounts = {};
  const issues = [];

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

  const semanticSurfaceGranularity = getSemanticSurfaceGranularity(db);
  if (semanticSurfaceGranularity.materiallyDrifting === true) {
    issues.push({
      issueType: `${ISSUE_TYPE_PREFIX}_semantic_surface_drift`,
      severity: 'medium',
      message: `semantic_connections (${semanticSurfaceGranularity.fileLevel.total}) is drifting from the canonical semantic summary derived from atom_relations (${semanticSurfaceGranularity.legacyView.total}).`,
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
  const staleFileRows = Number(liveRowSync?.summary?.staleFileRows || 0);
  const staleRiskRows = Number(liveRowSync?.summary?.staleRiskRows || 0);
  if (staleFileRows > 0 || staleRiskRows > 0) {
    issues.push({
      issueType: `${ISSUE_TYPE_PREFIX}_live_row_drift`,
      severity: staleFileRows > 0 ? 'high' : 'medium',
      message: `Live support tables are drifting from the atom graph (${staleFileRows} stale file rows, ${staleRiskRows} stale risk rows).`,
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

export async function syncRuntimeTableHealthIssues(projectPath, options = {}) {
  try {
    const db = options.db || await getWatcherIssueDb(projectPath);
    if (!db) {
      return {
        activeIssues: [],
        persisted: 0,
        cleared: 0,
        tableCounts: {},
        semanticSurfaceGranularity: null,
        liveRowSync: null
      };
    }

    const runtimeHealth = buildRuntimeHealthIssues(db);
    if (options.deep === true) {
      const deepIssues = await buildDeepRuntimeHealthIssues(projectPath, db);
      runtimeHealth.issues.push(...deepIssues);
    }
    const desiredIssueTypes = new Set(runtimeHealth.issues.map((issue) => issue.issueType));
    let persisted = 0;
    let cleared = 0;

    for (const issue of runtimeHealth.issues) {
      if (upsertWatcherIssueRecord(db, {
        filePath: PROJECT_WIDE_FILE,
        issueType: issue.issueType,
        severity: issue.severity,
        message: issue.message,
        context: issue.context
      }, {
        logPrefix: '[RUNTIME TABLE HEALTH]'
      })) {
        persisted += 1;
      }
    }

    for (const issueType of buildKnownIssueTypes()) {
      if (desiredIssueTypes.has(issueType)) continue;
      const result = clearWatcherIssueRecord(db, PROJECT_WIDE_FILE, issueType, 'expired');
      if (Number(result?.changes || 0) > 0) {
        cleared += 1;
      }
    }

    return {
      activeIssues: runtimeHealth.issues,
      persisted,
      cleared,
      tableCounts: runtimeHealth.tableCounts,
      semanticSurfaceGranularity: runtimeHealth.semanticSurfaceGranularity,
      liveRowSync: runtimeHealth.liveRowSync
    };
  } catch (error) {
    logger.error('Failed to sync runtime table health issues:', error.message);
    return {
      activeIssues: [],
      persisted: 0,
      cleared: 0,
      tableCounts: {},
      semanticSurfaceGranularity: null,
      liveRowSync: null,
      error: error.message
    };
  }
}
