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
import { buildPropagationPlan, summarizePropagationPlan } from '../../../../shared/compiler/index.js';

function buildStoragePropagation(health, duplicates, genealogy) {
  const issueCount = (health?.anomalies?.length || 0)
    + (duplicates?.duplicateGroups > 0 ? 1 : 0)
    + (genealogy?.issues?.length || 0);

  return buildPropagationPlan({
    changeType: 'storage_audit',
    decision: issueCount === 0 ? 'approve' : 'review',
    mode: issueCount === 0 ? 'alert_and_recommend' : 'alert_and_review',
    candidateCount: 0,
    findingCount: issueCount,
    ruleCount: 0,
    policyAreaCount: 1,
    connectedSystems: ['storage_governance', 'status_panel', 'health_snapshot', 'pipeline_health'],
    recommendationStrategy: issueCount === 0 ? 'keep_storage_healthy' : 'review_storage_anomalies'
  });
}

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

    const propagation = summarizePropagationPlan(
      buildStoragePropagation(health, duplicates, genealogy)
    );

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
      propagation,
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
