/**
 * @fileoverview Canonical cleanup helpers for stale support-table rows.
 *
 * @module shared/compiler/live-row-cleanup
 */

import { buildLiveRowReconciliationPlan } from './live-row-reconciliation.js';
import { getLiveFileSetSql } from './live-row-drift.js';

function buildDeleteStatement(tableName, fileColumn) {
  return `UPDATE ${tableName} SET is_removed = 1, updated_at = datetime('now') WHERE ${fileColumn} NOT IN (${getLiveFileSetSql()}) AND (is_removed IS NULL OR is_removed = 0)`;
}

export function buildLiveRowCleanupPlan(db, options = {}) {
  const reconciliation = buildLiveRowReconciliationPlan(db, options);

  return {
    summary: reconciliation.summary,
    dryRun: true,
    statements: {
      files: buildDeleteStatement('files', 'path'),
      riskAssessments: buildDeleteStatement('risk_assessments', 'file_path'),
      relations: `UPDATE atom_relations SET is_removed = 1, updated_at = datetime('now'), lifecycle_status = 'removed' WHERE (is_removed IS NULL OR is_removed = 0) AND (NOT EXISTS (SELECT 1 FROM atoms WHERE id = source_id AND (is_removed IS NULL OR is_removed = 0)) OR NOT EXISTS (SELECT 1 FROM atoms WHERE id = target_id AND (is_removed IS NULL OR is_removed = 0)))`,
      issues: `UPDATE semantic_issues SET is_removed = 1, updated_at = datetime('now'), lifecycle_status = 'removed' WHERE (is_removed IS NULL OR is_removed = 0) AND (file_path != 'project-wide') AND NOT EXISTS (SELECT 1 FROM files WHERE path = file_path AND (is_removed IS NULL OR is_removed = 0))`,
      connections: `UPDATE semantic_connections SET is_removed = 1, updated_at = datetime('now'), lifecycle_status = 'removed' WHERE (is_removed IS NULL OR is_removed = 0) AND (NOT EXISTS (SELECT 1 FROM files WHERE path = source_path AND (is_removed IS NULL OR is_removed = 0)) OR NOT EXISTS (SELECT 1 FROM files WHERE path = target_path AND (is_removed IS NULL OR is_removed = 0)))`
    },

    recommendedActions: [
      'Run cleanup only after the live atom graph is up to date.',
      'This marks orphaned relations and issues as removed (soft-delete).',
      'Soft-delete preserves history while maintaining pipeline health scores.'
    ]

  };
}

export function executeLiveRowCleanup(db, options = {}) {
  const { dryRun = true } = options;
  const plan = buildLiveRowCleanupPlan(db, options);

  if (dryRun) {
    return {
      ...plan,
      deleted: {
        files: 0,
        riskAssessments: 0,
        relations: 0,
        issues: 0,
        connections: 0
      }
    };
  }

  const deletedFiles = db.prepare(plan.statements.files).run().changes || 0;
  const deletedRiskAssessments = db.prepare(plan.statements.riskAssessments).run().changes || 0;
  const deletedRelations = db.prepare(plan.statements.relations).run().changes || 0;
  const deletedIssues = db.prepare(plan.statements.issues).run().changes || 0;
  const deletedConnections = db.prepare(plan.statements.connections).run().changes || 0;

  return {
    ...plan,
    dryRun: false,
    deleted: {
      files: deletedFiles,
      riskAssessments: deletedRiskAssessments,
      relations: deletedRelations,
      issues: deletedIssues,
      connections: deletedConnections
    }
  };

}

// CLI Execution entry point
if (process.argv[1] && (process.argv[1].includes('live-row-cleanup.js') || process.argv[1].endsWith('live-row-cleanup.js'))) {
  const { getRepository } = await import('../../layer-c-memory/storage/repository/index.js');
  const repo = getRepository(process.cwd());
  executeLiveRowCleanup(repo, { dryRun: false })
    .then(result => {
      console.log('Janitor completed:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Janitor failed:', err);
      process.exit(1);
    });
}

