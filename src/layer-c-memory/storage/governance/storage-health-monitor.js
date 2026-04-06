/**
 * @fileoverview Storage Health Monitor
 *
 * Monitors sizes, growth rates, and anomalies across all OmnySys databases.
 * Detects sudden spikes in storage consumption that indicate bugs or misconfiguration.
 *
 * @module layer-c-memory/storage/governance/storage-health-monitor
 */

import {
  getAtomHistoryDbPath,
  getCompilerHistoryDbPath,
  getCompilerDataDir
} from '../../../shared/compiler/compiler-persistence-paths.js';
import { getRepository } from '../repository/index.js';
import { createLogger } from '../../../utils/logger.js';
import { existsSync, statSync } from 'fs';

const logger = createLogger('OmnySys:StorageHealthMonitor');

/**
 * Thresholds for anomaly detection
 */
const THRESHOLDS = {
  // atom-history.db should NOT exceed 500MB for a project this size
  atomHistoryMaxBytes: 500 * 1024 * 1024,
  // omnysys.db should NOT exceed 200MB
  omnysysDbMaxBytes: 200 * 1024 * 1024,
  // Growth spike: if DB grew >50% since last check
  growthSpikePct: 50,
  // atom-history.db rows per atom should be ~1-3 (skeleton + enriched + edits)
  maxArchiveRowsPerAtom: 10,
  // If archive has >100K rows for 13K atoms, something is wrong
  maxArchiveTotalRows: 200000
};

/**
 * Gets file sizes for all storage databases
 */
function collectDatabaseSizes(rootPath) {
  const files = [
    { path: `${rootPath}/omnysys.db`, label: 'omnysys.db' },
    { path: getAtomHistoryDbPath(rootPath), label: 'atom-history.db' },
    { path: getCompilerHistoryDbPath(rootPath), label: 'health-history.db' }
  ];

  const sizes = [];
  for (const file of files) {
    if (existsSync(file.path)) {
      const stats = statSync(file.path);
      sizes.push({
        label: file.label,
        path: file.path,
        exists: true,
        sizeBytes: stats.size,
        sizeMB: Math.round(stats.size / 1024 / 1024),
        modifiedAt: stats.mtime.toISOString()
      });
    } else {
      sizes.push({
        label: file.label,
        path: file.path,
        exists: false,
        sizeBytes: 0,
        sizeMB: 0,
        modifiedAt: null
      });
    }
  }

  return sizes;
}

/**
 * Gets atom-history.db row counts and archive health
 */
async function collectArchiveMetrics(rootPath) {
  const archivePath = getAtomHistoryDbPath(rootPath);
  if (!existsSync(archivePath)) {
    return { exists: false, totalRows: 0, bySource: [], rowsPerAtom: 0 };
  }

  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(archivePath, { readonly: true });

    // Check if the archive table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='atom_versions_archive'
    `).get();

    if (!tableCheck) {
      db.close();
      return { exists: true, tableExists: false, totalRows: 0, bySource: [], rowsPerAtom: 0 };
    }

    const total = db.prepare('SELECT COUNT(*) as c FROM atom_versions_archive').get();
    const bySource = db.prepare(`
      SELECT source, COUNT(*) as cnt
      FROM atom_versions_archive
      GROUP BY source
      ORDER BY cnt DESC
    `).all();

    // Count unique atoms in archive
    const uniqueAtoms = db.prepare(`
      SELECT COUNT(DISTINCT atom_id) as c FROM atom_versions_archive
    `).get();

    db.close();

    return {
      exists: true,
      tableExists: true,
      totalRows: total.c,
      bySource: bySource,
      uniqueAtoms: uniqueAtoms.c,
      rowsPerAtom: uniqueAtoms.c > 0 ? Math.round((total.c / uniqueAtoms.c) * 10) / 10 : 0
    };
  } catch (error) {
    logger.warn(`Failed to collect archive metrics: ${error.message}`);
    return { exists: true, totalRows: 0, bySource: [], rowsPerAtom: 0, error: error.message };
  }
}

/**
 * Gets operational DB atom count
 */
function collectOperationalMetrics(rootPath) {
  try {
    const repo = getRepository(rootPath);
    if (!repo?.db) return { totalAtoms: 0, totalFiles: 0 };

    const atoms = repo.db.prepare(`
      SELECT COUNT(*) as c FROM atoms WHERE (is_removed IS NULL OR is_removed = 0)
    `).get();

    const files = repo.db.prepare(`
      SELECT COUNT(*) as c FROM files WHERE (is_removed IS NULL OR is_removed = 0)
    `).get();

    const versions = repo.db.prepare('SELECT COUNT(*) as c FROM atom_versions').get();

    return {
      totalAtoms: atoms.c,
      totalFiles: files.c,
      totalVersions: versions.c
    };
  } catch (error) {
    logger.warn(`Failed to collect operational metrics: ${error.message}`);
    return { totalAtoms: 0, totalFiles: 0, totalVersions: 0 };
  }
}

/**
 * Detects anomalies based on current state
 */
function detectAnomalies(dbSizes, archiveMetrics, operational) {
  const anomalies = [];
  const recommendations = [];

  // Check atom-history.db size
  const historyDb = dbSizes.find(d => d.label === 'atom-history.db');
  if (historyDb && historyDb.sizeBytes > THRESHOLDS.atomHistoryMaxBytes) {
    anomalies.push({
      type: 'atom_history_oversized',
      severity: 'high',
      message: `atom-history.db is ${historyDb.sizeMB}MB (threshold: ${THRESHOLDS.atomHistoryMaxBytes / 1024 / 1024}MB)`,
      impact: 'Excessive storage consumption, likely duplicate content or archive bug'
    });
    recommendations.push('Run archive duplicate detection and vacuum');
  }

  // Check omnysys.db size
  const omnysysDb = dbSizes.find(d => d.label === 'omnysys.db');
  if (omnysysDb && omnysysDb.sizeBytes > THRESHOLDS.omnysysDbMaxBytes) {
    anomalies.push({
      type: 'omnysys_db_oversized',
      severity: 'high',
      message: `omnysys.db is ${omnysysDb.sizeMB}MB (threshold: ${THRESHOLDS.omnysysDbMaxBytes / 1024 / 1024}MB)`,
      impact: 'Database bloat, may need VACUUM or orphan cleanup'
    });
    recommendations.push('Run VACUUM on omnysys.db and reconcile orphaned rows');
  }

  // Check archive rows per atom ratio
  if (archiveMetrics.exists && operational.totalAtoms > 0) {
    const ratio = archiveMetrics.rowsPerAtom;
    if (ratio > THRESHOLDS.maxArchiveRowsPerAtom) {
      anomalies.push({
        type: 'excessive_archive_ratio',
        severity: 'high',
        message: `Archive has ${ratio} rows per atom (threshold: ${THRESHOLDS.maxArchiveRowsPerAtom})`,
        impact: 'Likely event-bulk-handler or similar archiving everything on each flush'
      });
      recommendations.push('Check that only incremental-atom-saver archives to atom-history.db');
    }
  }

  // Check total archive rows
  if (archiveMetrics.totalRows > THRESHOLDS.maxArchiveTotalRows) {
    anomalies.push({
      type: 'excessive_archive_rows',
      severity: 'high',
      message: `Archive has ${archiveMetrics.totalRows.toLocaleString()} rows (threshold: ${THRESHOLDS.maxArchiveTotalRows.toLocaleString()})`,
      impact: 'Storage bloat, likely duplicate content or incorrect archiving logic'
    });
    recommendations.push('Run archive deduplication and remove duplicate content rows');
  }

  // Check missing atom-history.db after Phase 2 completed
  if (!archiveMetrics.exists && operational.totalAtoms > 1000) {
    anomalies.push({
      type: 'archive_missing_after_index',
      severity: 'low',
      message: 'atom-history.db does not exist despite indexed atoms',
      impact: 'No genealogical history available; will start on next edit/Phase 2'
    });
    recommendations.push('Archive will be created on next atom modification or Phase 2 run');
  }

  return { anomalies, recommendations, healthy: anomalies.filter(a => a.severity === 'high').length === 0 };
}

/**
 * Main function: produces a comprehensive storage health report
 */
export async function getStorageHealthReport(projectPath) {
  const dbSizes = collectDatabaseSizes(projectPath);
  const archiveMetrics = await collectArchiveMetrics(projectPath);
  const operational = collectOperationalMetrics(projectPath);
  const { anomalies, recommendations, healthy } = detectAnomalies(dbSizes, archiveMetrics, operational);

  const totalSizeBytes = dbSizes.reduce((sum, d) => sum + d.sizeBytes, 0);
  const totalSizeMB = Math.round(totalSizeBytes / 1024 / 1024);

  // Calculate health score (0-100)
  let score = 100;
  for (const anomaly of anomalies) {
    if (anomaly.severity === 'high') score -= 25;
    else if (anomaly.severity === 'medium') score -= 15;
    else score -= 5;
  }
  score = Math.max(0, score);

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return {
    checkedAt: new Date().toISOString(),
    projectPath,
    health: { score, grade, healthy },
    databases: dbSizes,
    archive: archiveMetrics,
    operational,
    totalSizeBytes,
    totalSizeMB,
    anomalies,
    recommendations,
    thresholds: THRESHOLDS
  };
}

export { THRESHOLDS, collectDatabaseSizes, collectArchiveMetrics, collectOperationalMetrics, detectAnomalies };
