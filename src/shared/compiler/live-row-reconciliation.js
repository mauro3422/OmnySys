/**
 * @fileoverview High-level live-row reconciliation and remediation entrypoints.
 *
 * @module shared/compiler/live-row-reconciliation
 */

import { buildStandardPlan } from './remediation-plan-builder.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';
import { buildOrphanCallCleanupStatement } from './live-row-relations-cleanup.js';
import { countLiveRowDeletes, hasLiveRowDrift, runLiveRowCleanup } from './live-row-sync-helpers.js';
import {
  getLiveFileSetSql,
  getLiveRowDriftSummary,
  loadStaleTableRows
} from './live-row-utils.js';

function getPhase2PendingFiles(db) {
    try {
        return db.prepare('SELECT COUNT(DISTINCT file_path) as total FROM atoms WHERE is_phase2_complete = 0').get()?.total || 0;
    } catch {
        return 0;
    }
}

function buildZeroCleanupResult() {
    return { atoms: 0, files: 0, riskAssessments: 0, relations: 0, issues: 0, connections: 0 };
}

function buildDeleteStatement(tableName, fileColumn) {
    return `UPDATE ${tableName} SET is_removed = 1, updated_at = datetime('now') WHERE ${fileColumn} NOT IN (${getLiveFileSetSql()}) AND (is_removed IS NULL OR is_removed = 0)`;
}

export function buildLiveRowReconciliationPlan(db, options = {}) {
    const sampleLimit = Number.isFinite(Number(options.sampleLimit)) ? Math.floor(Number(options.sampleLimit)) : 10;
    const driftSummary = getLiveRowDriftSummary(db);

    return {
        summary: driftSummary,
        staleAtomSamples: db.prepare(`
      SELECT a.id, a.name, a.file_path, a.purpose_type, a.updated_at
      FROM atoms a
      LEFT JOIN files f ON a.file_path = f.path
      WHERE (a.is_removed IS NULL OR a.is_removed = 0)
        AND (f.path IS NULL OR f.is_removed = 1)
      LIMIT ?
    `).all(sampleLimit),
        staleFileSamples: loadStaleTableRows(db, {
            tableName: 'files',
            fileColumn: 'path',
            selectColumns: ['path', 'atom_count', 'last_analyzed', 'hash'],
            limit: sampleLimit
        }),
        staleRiskSamples: loadStaleTableRows(db, {
            tableName: 'risk_assessments',
            fileColumn: 'file_path',
            selectColumns: ['file_path', 'risk_score', 'risk_level', 'assessed_at'],
            limit: sampleLimit
        }),
        recommendedActions: [
            'Reconcile stale files rows against the live atom graph before trusting support-table counts.',
            'Drop or archive stale risk rows once the owning file is no longer present in atoms.',
            'Prefer live atom-backed counts for compiler telemetry while cleanup remains pending.',
            'Reconcile orphan call relations so atom_relations and call_graph stay aligned.',
            'Refresh semantic connection summaries on system_files after semantic_connections are rebuilt.'
        ]
    };
}

export function buildLiveRowCleanupPlan(db, options = {}) {
    const reconciliation = buildLiveRowReconciliationPlan(db, options);

    return {
        summary: reconciliation.summary,
        dryRun: true,
        statements: {
            atoms: `UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE (is_removed IS NULL OR is_removed = 0) AND file_path IS NOT NULL AND file_path != '' AND NOT EXISTS (SELECT 1 FROM files WHERE path = atoms.file_path AND (is_removed IS NULL OR is_removed = 0))`,
            files: buildDeleteStatement('files', 'path'),
            riskAssessments: `UPDATE risk_assessments SET is_removed = 1, lifecycle_status = 'removed', updated_at = datetime('now') WHERE file_path NOT IN (${getLiveFileSetSql()}) AND (is_removed IS NULL OR is_removed = 0)`,
            relations: buildOrphanCallCleanupStatement(),
            issues: `UPDATE semantic_issues SET is_removed = 1, updated_at = datetime('now'), lifecycle_status = 'removed' WHERE (is_removed IS NULL OR is_removed = 0) AND (file_path != 'project-wide') AND NOT EXISTS (SELECT 1 FROM files WHERE path = file_path AND (is_removed IS NULL OR is_removed = 0))`,
            connections: `UPDATE semantic_connections SET is_removed = 1, updated_at = datetime('now'), lifecycle_status = 'removed' WHERE (is_removed IS NULL OR is_removed = 0) AND (NOT EXISTS (SELECT 1 FROM files WHERE path = source_path AND (is_removed IS NULL OR is_removed = 0)) OR NOT EXISTS (SELECT 1 FROM files WHERE path = target_path AND (is_removed IS NULL OR is_removed = 0)))`
        },
        recommendedActions: [
            'Run cleanup only after the live atom graph is up to date.',
            'This marks orphaned issues and support rows as removed (soft-delete).',
            'Soft-delete preserves history while maintaining pipeline health scores.'
        ]
    };
}

export function executeLiveRowCleanup(db, options = {}) {
    const { dryRun = true } = options;
    const plan = buildLiveRowCleanupPlan(db, options);
    const phase2PendingFiles = getPhase2PendingFiles(db);

    if (phase2PendingFiles > 0 && options.allowDuringPhase2 !== true) {
        return {
            ...plan,
            dryRun: true,
            skipped: true,
            skippedReason: 'phase2_settling',
            phase2PendingFiles,
            deleted: buildZeroCleanupResult()
        };
    }

    if (dryRun) {
        return {
            ...plan,
            deleted: buildZeroCleanupResult()
        };
    }

    const deletedAtoms = db.prepare(plan.statements.atoms).run().changes || 0;
    const deletedFiles = db.prepare(plan.statements.files).run().changes || 0;
    const deletedRiskAssessments = db.prepare(plan.statements.riskAssessments).run().changes || 0;
    const deletedRelations = plan.statements.relations
        ? (db.prepare(plan.statements.relations).run().changes || 0)
        : 0;
    const deletedIssues = db.prepare(plan.statements.issues).run().changes || 0;
    const deletedConnections = db.prepare(plan.statements.connections).run().changes || 0;

    return {
        ...plan,
        dryRun: false,
        deleted: {
            atoms: deletedAtoms,
            files: deletedFiles,
            riskAssessments: deletedRiskAssessments,
            relations: deletedRelations,
            issues: deletedIssues,
            connections: deletedConnections
        }
    };
}

export function buildLiveRowRemediationPlan(db, options = {}) {
    const reconciliationPlan = buildLiveRowReconciliationPlan(db, options);
    const {
        liveFileTotal = 0,
        staleAtomRows = 0,
        staleFileRows = 0,
        staleRiskRows = 0,
        staleRelationRows = 0,
        staleConnectionRows = 0
    } = reconciliationPlan.summary || {};
    const severity = (staleAtomRows + staleFileRows + staleRiskRows + staleRelationRows + staleConnectionRows) > 0 ? 'warning' : 'ok';

    return buildStandardPlan({
        total: staleAtomRows + staleFileRows + staleRiskRows + staleRelationRows + staleConnectionRows,
        items: [],
        recommendation: getRecommendation({ type: 'live_row_drift' }).message,
        severity,
        summary: reconciliationPlan.summary,
        staleAtomSamples: reconciliationPlan.staleAtomSamples,
        staleFileSamples: reconciliationPlan.staleFileSamples,
        staleRiskSamples: reconciliationPlan.staleRiskSamples,
        actions: [
            liveFileTotal > 0 ? 'Use atom-backed live file totals as source of truth.' : 'Populate atoms first.',
            staleAtomRows > 0 ? 'Purge stale atoms that no longer have a canonical file row.' : 'atoms table is aligned.',
            staleFileRows > 0 ? 'Purge stale files rows.' : 'files table is aligned.',
            staleRiskRows > 0 ? 'Purge stale risk rows.' : 'risk_assessments is aligned.',
            staleRelationRows > 0 ? 'Reconcile orphan call relations from atom_relations.' : 'call relations are aligned.',
            staleConnectionRows > 0 ? 'Refresh semantic connection summaries on system_files.' : 'semantic connection summaries are aligned.'
        ]
    });
}

export function ensureLiveRowSync(db, options = {}) {
    const { autoSync = true, sampleLimit = 5 } = options;
    const phase2PendingFiles = getPhase2PendingFiles(db);
    const before = buildLiveRowReconciliationPlan(db, { sampleLimit });
    const cleanupOutcome = runLiveRowCleanup(db, before, { autoSync, sampleLimit }, executeLiveRowCleanup);
    const after = buildLiveRowReconciliationPlan(db, { sampleLimit });

    return {
        autoSync,
        phase2PendingFiles,
        hadDrift: hasLiveRowDrift(before?.summary),
        deferred: Boolean(cleanupOutcome.cleanup?.skipped),
        skipped: Boolean(cleanupOutcome.cleanup?.skipped),
        skippedReason: cleanupOutcome.cleanup?.skippedReason || null,
        synchronized: countLiveRowDeletes(cleanupOutcome.cleanup?.deleted) > 0 && !cleanupOutcome.cleanupError,
        cleanupError: cleanupOutcome.cleanupError,
        deleted: cleanupOutcome.cleanup?.deleted || buildZeroCleanupResult(),
        before,
        after,
        summary: after.summary
    };
}
