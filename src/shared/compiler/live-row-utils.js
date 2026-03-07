/**
 * @fileoverview Canonical helpers for reconciling live atom-backed files 
 * against persisted support tables (files, risk_assessments, etc.).
 *
 * @module shared/compiler/live-row-utils
 */

import { buildStandardPlan, buildStandardItem } from './remediation-plan-builder.js';

const MANUAL_LIVE_ROW_PATTERNS = [
    /(LEFT JOIN|NOT IN)\s+live_files/,
    /(staleFileRows|staleRiskRows|liveFileTotal|unassessedLiveFiles)/,
    /(daemon-owner-|ownerLockPath|OWNER_LOCK_PATH|readOwnerLock|writeOwnerLock|waitForExistingOwner|removeOwnerLock)/
];

const CANONICAL_LIVE_ROW_RESOURCES = [
    /getLiveRowDriftSummary/,
    /getStaleTableRowCount/,
    /getLiveFileTotal/,
    /getLiveFileSetSql/,
    /ensureLiveRowSync\s*\(/,
    /liveRowSync\.summary/
];

function toCount(row = {}, key = 'total') {
    return Number(row?.[key] || 0);
}

function normalizeLimit(limit, fallback = 10) {
    const numeric = Number(limit);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

// --- DRIFT LOGIC ---

export function getLiveFileSetSql() {
    return `
    SELECT DISTINCT file_path
    FROM atoms
    WHERE file_path IS NOT NULL
      AND file_path != ''
  `;
}

export function getLiveFileTotal(db) {
    return toCount(
        db.prepare(`
      SELECT COUNT(DISTINCT file_path) as total
      FROM atoms
      WHERE file_path IS NOT NULL
        AND file_path != ''
    `).get()
    );
}

export function getStaleTableRowCount(db, tableName, fileColumn = 'file_path') {
    return toCount(
        db.prepare(`
      SELECT COUNT(*) as total
      FROM ${tableName}
      WHERE ${fileColumn} NOT IN (${getLiveFileSetSql()})
    `).get()
    );
}

export function getLiveRowDriftSummary(db) {
    const liveFileTotal = getLiveFileTotal(db);
    const staleFileRows = getStaleTableRowCount(db, 'files', 'path');
    const staleRiskRows = getStaleTableRowCount(db, 'risk_assessments', 'file_path');

    return {
        liveFileTotal,
        staleFileRows,
        staleRiskRows
    };
}

/**
 * Detecta si un código está reimplementando lógica de drift de live-rows
 * de forma manual.
 */
export function detectLiveRowDrift(source = '', filePath = '') {
    const findings = [];
    const hasManualLogic = MANUAL_LIVE_ROW_PATTERNS.some(p => p.test(source));
    const hasCanonicalUse = CANONICAL_LIVE_ROW_RESOURCES.some(p => p.test(source));

    if (hasManualLogic && !hasCanonicalUse && !filePath.endsWith('/live-row-utils.js')) {
        findings.push({
            rule: 'manual_live_row_drift_scan',
            severity: 'medium',
            policyArea: 'live_row_drift',
            message: 'Manual live/stale row drift logic detected',
            recommendation: 'Use getLiveRowDriftSummary / ensureLiveRowSync from shared/compiler instead of hand-rolling stale row SQL.'
        });
    }

    return findings;
}

// --- RECONCILIATION LOGIC ---

export function loadStaleTableRows(db, options = {}) {
    const {
        tableName,
        fileColumn = 'file_path',
        selectColumns = ['*'],
        limit = 10
    } = options;

    if (!tableName) throw new Error('tableName is required');

    const columns = Array.isArray(selectColumns) && selectColumns.length > 0
        ? selectColumns.join(', ')
        : '*';

    return db.prepare(`
    SELECT ${columns}
    FROM ${tableName}
    WHERE ${fileColumn} NOT IN (${getLiveFileSetSql()})
    LIMIT ?
  `).all(normalizeLimit(limit));
}

export function buildLiveRowReconciliationPlan(db, options = {}) {
    const sampleLimit = normalizeLimit(options.sampleLimit, 10);
    const driftSummary = getLiveRowDriftSummary(db);

    return {
        summary: driftSummary,
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
            'Prefer live atom-backed counts for compiler telemetry while cleanup remains pending.'
        ]
    };
}

// --- CLEANUP LOGIC ---

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
            deleted: { files: 0, riskAssessments: 0, relations: 0, issues: 0, connections: 0 }
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

// --- REMEDIATION LOGIC ---

export function buildLiveRowRemediationPlan(db, options = {}) {
    const reconciliationPlan = buildLiveRowReconciliationPlan(db, options);
    const { liveFileTotal = 0, staleFileRows = 0, staleRiskRows = 0 } = reconciliationPlan.summary || {};
    const severity = (staleFileRows + staleRiskRows) > 0 ? 'warning' : 'ok';

    return buildStandardPlan({
        total: staleFileRows + staleRiskRows,
        items: [],
        recommendation: 'Reconcile support tables with the live atom graph.',
        severity,
        summary: reconciliationPlan.summary,
        staleFileSamples: reconciliationPlan.staleFileSamples,
        staleRiskSamples: reconciliationPlan.staleRiskSamples,
        actions: [
            liveFileTotal > 0 ? 'Use atom-backed live file totals as source of truth.' : 'Populate atoms first.',
            staleFileRows > 0 ? 'Purge stale files rows.' : 'files table is aligned.',
            staleRiskRows > 0 ? 'Purge stale risk rows.' : 'risk_assessments is aligned.'
        ]
    });
}

// --- SYNC ENTRYPOINT ---

export function ensureLiveRowSync(db, options = {}) {
    const { autoSync = true, sampleLimit = 5 } = options;
    const before = buildLiveRowReconciliationPlan(db, { sampleLimit });
    const hasDrift = (before.summary?.staleFileRows || 0) > 0 || (before.summary?.staleRiskRows || 0) > 0;

    let cleanup = { dryRun: true, deleted: { files: 0, riskAssessments: 0 } };
    let cleanupError = null;

    if (autoSync && hasDrift) {
        try {
            cleanup = executeLiveRowCleanup(db, { dryRun: false, sampleLimit });
        } catch (error) {
            cleanupError = { message: error?.message || 'Live-row sync failed', code: 'LIVE_ROW_SYNC_FAILED' };
        }
    }

    const after = buildLiveRowReconciliationPlan(db, { sampleLimit });
    const deletedTotal = (cleanup.deleted?.files || 0) + (cleanup.deleted?.riskAssessments || 0);

    return {
        autoSync,
        hadDrift: hasDrift,
        synchronized: deletedTotal > 0 && !cleanupError,
        cleanupError,
        deleted: cleanup.deleted,
        before,
        after,
        summary: after.summary
    };
}
