/**
 * @fileoverview Storage Health MCP Handler
 *
 * Handles aggregate:metrics -> storage_health
 * Returns comprehensive storage governance report.
 *
 * @module layer-c-memory/mcp/tools/handlers/storage-health-handler
 */

import {
  getStorageGovernanceReport,
  runStorageMaintenance
} from '../../../storage/governance/index.js';

export async function handleStorageHealth(tool, projectPath, options = {}) {
  const {
    runMaintenance = false,
    dryRun = true,
    includeDuplicates = true,
    includeGenealogy = true
  } = options;

  try {
    const report = getStorageGovernanceReport(projectPath, {
      runMaintenance,
      dryRun
    });

    // Trim verbose details for MCP response
    return {
      health: {
        score: report.health.health.score,
        grade: report.health.health.grade,
        healthy: report.health.health.healthy,
        totalSizeMB: report.health.totalSizeMB,
        anomalies: report.health.anomalies.length,
        databases: report.health.databases.map(d => ({
          label: d.label,
          sizeMB: d.sizeMB,
          exists: d.exists
        }))
      },
      archive: report.duplicates ? {
        exists: report.duplicates.exists,
        totalRows: report.duplicates.totalRows,
        duplicateGroups: report.duplicates.duplicateGroups,
        rowsPerAtom: report.duplicates.rowsPerAtom,
        healthy: report.duplicates.healthy,
        bySource: report.duplicates.bySource
      } : null,
      genealogy: report.genealogy ? {
        healthy: report.genealogy.healthy,
        atomCoveragePct: report.genealogy.atomCoveragePct,
        atomsWithoutGenealogy: report.genealogy.atomsWithoutGenealogy,
        orphanedArchiveRows: report.genealogy.orphanedArchiveRows,
        issues: report.genealogy.issues?.length || 0
      } : null,
      maintenance: report.maintenance ? {
        dryRun: report.maintenance.dryRun,
        operations: Object.fromEntries(
          Object.entries(report.maintenance.operations).map(([k, v]) => [k, { success: v.success, message: v.message || null, freedMB: v.freedMB }])
        )
      } : null,
      summary: report.summary,
      recommendations: [
        ...report.health.recommendations,
        ...(report.genealogy?.recommendations || [])
      ].slice(0, 10)
    };
  } catch (error) {
    return {
      error: error.message,
      healthy: false
    };
  }
}
