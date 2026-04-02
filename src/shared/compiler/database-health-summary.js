/**
 * @fileoverview Canonical database health summary.
 *
 * This helper measures whether the persisted SQLite surfaces are aligned with
 * the live atom universe and the canonical projections that depend on it.
 *
 * @module shared/compiler/database-health
 */

import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
import {
  getSystemMapPersistenceCoverage,
  repairSystemMapPersistenceCoverage
} from './system-map-persistence.js';
import { buildDatabaseHealthAssessment } from './database-health-assessment.js';
import { loadDatabaseHealthCounts } from './counts.js';
import { resolveDatabaseHealthLiveRowSync } from './database-health-live-row-sync.js';
import { buildDatabaseHealthReport } from './report.js';
import { getPhase2PendingFiles } from './compiler-runtime-metrics/index.js';

export function getDatabaseHealthSummary(db, options = {}) {
  if (!db) {
    return {
      healthy: false,
      healthScore: 0,
      grade: 'F',
      summary: 'Database unavailable',
      metrics: {},
      criticalFindings: [{
        code: 'database_unavailable',
        severity: 'high',
        message: 'Repository database is not available',
        details: {}
      }],
      warnings: [],
      recommendations: ['Restart the runtime and ensure the repository can be initialized']
    };
  }

  const liveRowSync = resolveDatabaseHealthLiveRowSync(db, options);
  const phase2PendingFiles = getPhase2PendingFiles(db);
  let systemMapCoverage = getSystemMapPersistenceCoverage(db);
  const canAutoRepairSystemMap = phase2PendingFiles === 0;

  if (systemMapCoverage.healthy === false && canAutoRepairSystemMap) {
    const repairResult = repairSystemMapPersistenceCoverage(db);

    if (repairResult?.repaired === true) {
      systemMapCoverage = getSystemMapPersistenceCoverage(db);
    }
  }

  const counts = loadDatabaseHealthCounts(db);
  const fileUniverse = getFileUniverseGranularity({
    scannedFileTotal: counts.scannedFiles,
    manifestFileTotal: counts.scannedFiles,
    liveFileCount: counts.activeFiles
  });
  const semanticSurface = getSemanticSurfaceGranularity(db);

  const assessment = buildDatabaseHealthAssessment({
    counts,
    fileUniverse,
    systemMapCoverage,
    semanticSurface
  });

  return buildDatabaseHealthReport({
    counts,
    fileUniverse,
    systemMapCoverage,
    semanticSurface,
    assessment,
    liveRowSync
  });
}

export default getDatabaseHealthSummary;
