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
      riskAssessments: buildDeleteStatement('risk_assessments', 'file_path')
    },
    recommendedActions: [
      'Run cleanup only after the live atom graph is up to date.',
      'Archive stale support-table rows if historical reporting still needs them.',
      'Prefer dry-run review before executing destructive cleanup.'
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
        riskAssessments: 0
      }
    };
  }

  const deletedFiles = db.prepare(plan.statements.files).run().changes || 0;
  const deletedRiskAssessments = db.prepare(plan.statements.riskAssessments).run().changes || 0;

  return {
    ...plan,
    dryRun: false,
    deleted: {
      files: deletedFiles,
      riskAssessments: deletedRiskAssessments
    }
  };
}
