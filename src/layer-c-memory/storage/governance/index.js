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
export function getStorageGovernanceReport(projectPath, options = {}) {
  const { runMaintenance = false, dryRun = true } = options;

  const health = require('./storage-health-monitor.js');
  const dedup = require('./archive-duplicate-detector.js');
  const genealogy = require('./genealogy-validator.js');
  const cleaner = require('./storage-auto-cleaner.js');

  const report = {
    checkedAt: new Date().toISOString(),
    projectPath,
    health: health.getStorageHealthReport(projectPath),
    duplicates: dedup.detectArchiveDuplicates(projectPath),
    genealogy: genealogy.validateGenealogy(projectPath),
    maintenance: runMaintenance ? cleaner.runStorageMaintenance(projectPath, { dryRun }) : null,
    summary: null
  };

  // Generate overall assessment
  const issues = [];
  const recommendations = [];

  if (!report.health.healthy) {
    issues.push(...report.health.anomalies.map(a => a.message));
    recommendations.push(...report.health.recommendations);
  }
  if (!report.duplicates.healthy) {
    issues.push(`Archive has ${report.duplicates.duplicateGroups} duplicate groups (${report.duplicates.totalDuplicateRows} excess rows)`);
    recommendations.push('Run archive deduplication with dryRun=false to remove duplicates');
  }
  if (!report.genealogy.healthy) {
    if (report.genealogy.error) {
      issues.push(`Genealogy validation error: ${report.genealogy.error}`);
    } else if (report.genealogy.issues) {
      issues.push(...report.genealogy.issues.map(i => i.message));
      recommendations.push(...(report.genealogy.recommendations || []));
    }
  }

  const issueCount = issues.length;
  const severity = issueCount === 0 ? 'healthy' : issueCount <= 2 ? 'warning' : 'critical';

  report.summary = {
    severity,
    issueCount,
    issues: issues.slice(0, 10),
    recommendations: recommendations.slice(0, 10),
    totalStorageMB: report.health.totalSizeMB,
    archiveRows: report.duplicates.totalRows || 0,
    genealogyCoveragePct: report.genealogy.atomCoveragePct || 0
  };

  return report;
}
