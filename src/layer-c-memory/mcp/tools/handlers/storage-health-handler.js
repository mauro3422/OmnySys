/**
 * @fileoverview Storage Health MCP Handler
 *
 * Handles aggregate:metrics -> storage_health
 * Returns comprehensive storage governance report.
 *
 * @module layer-c-memory/mcp/tools/handlers/storage-health-handler
 */

import {
  getStorageHealthReport,
  detectArchiveDuplicates,
  validateGenealogy
} from '../../../storage/governance/index.js';

export async function handleStorageHealth(tool, projectPath, options = {}) {
  const { runMaintenance = false, dryRun = true } = options;

  try {
    const [health, duplicates, genealogy] = await Promise.all([
      getStorageHealthReport(projectPath),
      detectArchiveDuplicates(projectPath),
      validateGenealogy(projectPath)
    ]);

    const issues = [];
    const recommendations = [];

    if (health?.anomalies) {
      issues.push(...health.anomalies.map(a => a.message));
      recommendations.push(...(health.recommendations || []));
    }
    if (duplicates?.duplicateGroups > 0) {
      issues.push(`Archive has ${duplicates.duplicateGroups} duplicate groups (${duplicates.totalDuplicateRows} excess rows)`);
      recommendations.push('Run archive deduplication with dryRun=false to remove duplicates');
    }
    if (genealogy?.issues) {
      issues.push(...genealogy.issues.map(i => i.message));
      recommendations.push(...(genealogy.recommendations || []));
    }

    return {
      health: {
        score: health?.health?.score ?? 0,
        grade: health?.health?.grade ?? 'F',
        healthy: health?.health?.healthy ?? false,
        totalSizeMB: health?.totalSizeMB ?? 0,
        anomalies: health?.anomalies?.length ?? 0,
        databases: (health?.databases || []).map(d => ({ label: d.label, sizeMB: d.sizeMB, exists: d.exists }))
      },
      archive: duplicates ? {
        totalRows: duplicates.totalRows,
        duplicateGroups: duplicates.duplicateGroups,
        rowsPerAtom: duplicates.rowsPerAtom,
        healthy: duplicates.healthy
      } : null,
      genealogy: genealogy ? {
        healthy: genealogy.healthy,
        atomCoveragePct: genealogy.atomCoveragePct,
        atomsWithoutGenealogy: genealogy.atomsWithoutGenealogy,
        orphanedArchiveAtoms: genealogy.orphanedArchiveAtoms || 0
      } : null,
      maintenance: runMaintenance
        ? { message: 'Maintenance not yet available via MCP — use governance module directly', dryRun }
        : null,
      issues: issues.slice(0, 10),
      recommendations: recommendations.slice(0, 10),
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.message, healthy: false };
  }
}
