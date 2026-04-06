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
 * Builds the overall assessment summary from health, duplicates, and genealogy reports
 */
function buildStorageAssessment(healthReport, duplicatesReport, genealogyReport) {
  const issues = [];
  const recommendations = [];

  if (healthReport?.anomalies) {
    issues.push(...healthReport.anomalies.map(a => a.message));
    recommendations.push(...(healthReport.recommendations || []));
  }
  if (duplicatesReport?.duplicateGroups > 0) {
    issues.push(`Archive has ${duplicatesReport.duplicateGroups} duplicate groups (${duplicatesReport.totalDuplicateRows} excess rows)`);
    recommendations.push('Run archive deduplication with dryRun=false to remove duplicates');
  }
  if (genealogyReport?.issues) {
    issues.push(...genealogyReport.issues.map(i => i.message));
    recommendations.push(...(genealogyReport.recommendations || []));
  }
  if (genealogyReport?.error) {
    issues.push(`Genealogy validation error: ${genealogyReport.error}`);
  }

  const issueCount = issues.length;
  return {
    severity: issueCount === 0 ? 'healthy' : issueCount <= 2 ? 'warning' : 'critical',
    issueCount,
    issues: issues.slice(0, 10),
    recommendations: recommendations.slice(0, 10)
  };
}

/**
 * Comprehensive storage governance report combining all checks
 */
export async function getStorageGovernanceReport(projectPath, options = {}) {
  const { runMaintenance = false, dryRun = true } = options;

  try {
    const [healthReport, duplicatesReport, genealogyReport] = await Promise.all([
      getStorageHealthReport(projectPath),
      detectArchiveDuplicates(projectPath),
      validateGenealogy(projectPath)
    ]);

    let maintenanceReport = null;
    if (runMaintenance) {
      maintenanceReport = await runStorageMaintenance(projectPath, { dryRun });
    }

    const assessment = buildStorageAssessment(healthReport, duplicatesReport, genealogyReport);

    return {
      checkedAt: new Date().toISOString(),
      projectPath,
      health: healthReport,
      duplicates: duplicatesReport,
      genealogy: genealogyReport,
      maintenance: maintenanceReport,
      summary: {
        ...assessment,
        totalStorageMB: healthReport?.totalSizeMB || 0,
        archiveRows: duplicatesReport?.totalRows || 0,
        genealogyCoveragePct: genealogyReport?.atomCoveragePct || 0
      }
    };
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
