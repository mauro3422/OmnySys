/**
 * @fileoverview Storage Governance — Barrel Export
 *
 * Unified API for storage health monitoring, duplicate detection,
 * genealogy validation, and auto-cleanup.
 *
 * @module layer-c-memory/storage/governance
 */

export {
  getStorageHealthReport,
  THRESHOLDS,
  collectDatabaseSizes,
  collectArchiveMetrics,
  collectOperationalMetrics,
  detectAnomalies
} from './storage-health-monitor.js';

export {
  detectArchiveDuplicates,
  purgeArchiveDuplicates
} from './archive-duplicate-detector.js';

export {
  validateGenealogy
} from './genealogy-validator.js';

export {
  runStorageMaintenance,
  vacuumOperationalDb,
  vacuumArchiveDb,
  cleanOrphanedArchives
} from './storage-auto-cleaner.js';

/**
 * Comprehensive storage governance report combining all checks
 */
export async function getStorageGovernanceReport(projectPath, options = {}) {
  const { runMaintenance = false, dryRun = true } = options;

  try {
    const healthReport = await getStorageHealthReport(projectPath);
    const duplicatesReport = await detectArchiveDuplicates(projectPath);
    const genealogyReport = await validateGenealogy(projectPath);

    let maintenanceReport = null;
    if (runMaintenance) {
      maintenanceReport = await runStorageMaintenance(projectPath, { dryRun });
    }

    const report = {
      checkedAt: new Date().toISOString(),
      projectPath,
      health: healthReport,
      duplicates: duplicatesReport,
      genealogy: genealogyReport,
      maintenance: maintenanceReport,
      summary: null
    };

    // Generate overall assessment
    const issues = [];
    const recommendations = [];

    if (healthReport && !healthReport.healthy) {
      issues.push(...(healthReport.anomalies || []).map(a => a.message));
      recommendations.push(...(healthReport.recommendations || []));
    }
    if (duplicatesReport && !duplicatesReport.healthy) {
      issues.push(`Archive has ${duplicatesReport.duplicateGroups} duplicate groups (${duplicatesReport.totalDuplicateRows} excess rows)`);
      recommendations.push('Run archive deduplication with dryRun=false to remove duplicates');
    }
    if (genealogyReport && !genealogyReport.healthy) {
      if (genealogyReport.error) {
        issues.push(`Genealogy validation error: ${genealogyReport.error}`);
      } else if (genealogyReport.issues) {
        issues.push(...genealogyReport.issues.map(i => i.message));
        recommendations.push(...(genealogyReport.recommendations || []));
      }
    }

    const issueCount = issues.length;
    const severity = issueCount === 0 ? 'healthy' : issueCount <= 2 ? 'warning' : 'critical';

    report.summary = {
      severity,
      issueCount,
      issues: issues.slice(0, 10),
      recommendations: recommendations.slice(0, 10),
      totalStorageMB: healthReport?.totalSizeMB || 0,
      archiveRows: duplicatesReport?.totalRows || 0,
      genealogyCoveragePct: genealogyReport?.atomCoveragePct || 0
    };

    return report;
  } catch (error) {
    return {
      checkedAt: new Date().toISOString(),
      projectPath,
      error: error.message,
      health: null,
      duplicates: null,
      genealogy: null,
      maintenance: null,
      summary: {
        severity: 'error',
        issueCount: 1,
        issues: [error.message],
        recommendations: ['Check that omnysys.db and atom-history.db are accessible'],
        totalStorageMB: 0,
        archiveRows: 0,
        genealogyCoveragePct: 0
      }
    };
  }
}
