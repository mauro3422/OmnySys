import { getValidDnaPredicate, buildDuplicateWhereSql } from '#layer-c/storage/repository/utils/index.js';
import { runSemanticQuerySafely } from './query-utils.js';

export function runRaceConditionsQuery(db, { offset = 0, limit = 20, scopeType, asyncOnly = true, includeRemoved = false }) {
    return runSemanticQuerySafely(() => {
        const removedPredicate = includeRemoved ? '1=1' : '(is_removed IS NULL OR is_removed = 0)';
        let whereClause = `WHERE shared_state_json IS NOT NULL AND shared_state_json != '[]' AND ${removedPredicate}`;
        const params = [];

        if (asyncOnly) whereClause += ' AND is_async = 1';
        if (scopeType) {
            whereClause += ' AND scope_type = ?';
            params.push(scopeType);
        }

        const rows = db.prepare(`
            SELECT COUNT(*) OVER() as total_count,
                   id, name, file_path, line_start, line_end,
                   is_async, scope_type, shared_state_json,
                   complexity, importance_score, risk_level,
                   archetype_type, purpose_type
            FROM atoms
            ${whereClause}
            ORDER BY importance_score DESC, complexity DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        return { total: rows[0]?.total_count || 0, rows };
    }, 'queryRaceConditions', { total: 0, rows: [] });
}

export function runEventPatternsQuery(db, { offset = 0, limit = 20, type = 'all', includeRemoved = false }) {
    return runSemanticQuerySafely(() => {
        const removedPredicate = includeRemoved ? '1=1' : '(is_removed IS NULL OR is_removed = 0)';
        const conditions = [];

        if (type === 'emitters' || type === 'all') {
            conditions.push("(event_emitters_json IS NOT NULL AND event_emitters_json != '[]')");
        }
        if (type === 'listeners' || type === 'all') {
            conditions.push("(event_listeners_json IS NOT NULL AND event_listeners_json != '[]')");
        }

        const whereSql = conditions.length > 0
            ? `WHERE (${conditions.join(' OR ')}) AND ${removedPredicate}`
            : `WHERE ${removedPredicate}`;

        const rows = db.prepare(`
            SELECT COUNT(*) OVER() as total_count,
                   id, name, file_path, line_start, line_end,
                   event_emitters_json, event_listeners_json,
                   is_async, scope_type, complexity, importance_score, risk_level
            FROM atoms
            ${whereSql}
            ORDER BY importance_score DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        return { total: rows[0]?.total_count || 0, rows };
    }, 'queryEventPatterns', { total: 0, rows: [] });
}

export function runAsyncAtomsQuery(db, { offset = 0, limit = 20, withNetworkCalls = false, withErrorHandling = false, includeRemoved = false }) {
    return runSemanticQuerySafely(() => {
        const removedPredicate = includeRemoved ? '1=1' : '(is_removed IS NULL OR is_removed = 0)';
        let whereClause = `WHERE is_async = 1 AND ${removedPredicate}`;

        if (withNetworkCalls) whereClause += ' AND has_network_calls = 1';
        if (withErrorHandling) whereClause += ' AND has_error_handling = 1';

        const rows = db.prepare(`
            SELECT COUNT(*) OVER() as total_count,
                   id, name, file_path, line_start, line_end,
                   is_async, has_network_calls, has_error_handling,
                   external_call_count, complexity, importance_score,
                   risk_level, archetype_type
            FROM atoms
            ${whereClause}
            ORDER BY external_call_count DESC, complexity DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        return { total: rows[0]?.total_count || 0, rows };
    }, 'queryAsyncAtoms', { total: 0, rows: [] });
}

export function runSocietiesQuery(db, { offset = 0, limit = 20, type, includeRemoved = false }) {
    return runSemanticQuerySafely(() => {
        void includeRemoved;
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        const rows = db.prepare(`
            SELECT COUNT(*) OVER() as total_count,
                   id, name, type, cohesion_score, entropy_score, molecule_count,
                   metadata_json, created_at, updated_at
            FROM societies
            ${whereClause}
            ORDER BY cohesion_score DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        return { total: rows[0]?.total_count || 0, rows };
    }, 'querySocieties', { total: 0, rows: [] });
}

export function runDnaCoverageQuery(db) {
    return runSemanticQuerySafely(() => {
        const validDnaPredicate = getValidDnaPredicate();
        const row = db.prepare(`
            SELECT
                COUNT(*) totalAtoms,
                COUNT(CASE WHEN ${validDnaPredicate} THEN 1 END) withDna,
                COUNT(CASE WHEN file_path NOT LIKE '%/test%' AND file_path NOT LIKE '%.test.%' AND file_path NOT LIKE '%.spec.%' THEN 1 END) srcOnlyAtoms,
                COUNT(CASE WHEN file_path NOT LIKE '%/test%' AND file_path NOT LIKE '%.test.%' AND file_path NOT LIKE '%.spec.%' AND ${validDnaPredicate} THEN 1 END) srcWithDna,
                (
                    SELECT COUNT(*)
                    FROM atoms eligible_atoms
                    ${buildDuplicateWhereSql({ alias: 'eligible_atoms', eligibleOnly: true })}
                ) duplicateEligibleAtoms,
                (
                    SELECT COUNT(*)
                    FROM atoms eligible_atoms
                    ${buildDuplicateWhereSql({ alias: 'eligible_atoms', eligibleOnly: true, requireValidDna: true })}
                ) duplicateEligibleWithDna
            FROM atoms
            WHERE is_removed IS NULL OR is_removed = 0
        `).get();

        return {
            ...row,
            coveragePct: row.totalAtoms > 0 ? Math.round((row.withDna / row.totalAtoms) * 100) : 0,
            duplicateEligibleCoveragePct: row.duplicateEligibleAtoms > 0
                ? Math.round((row.duplicateEligibleWithDna / row.duplicateEligibleAtoms) * 100)
                : 0
        };
    }, 'queryDnaCoverage', {
        totalAtoms: 0,
        withDna: 0,
        coveragePct: 0,
        srcOnlyAtoms: 0,
        srcWithDna: 0,
        duplicateEligibleAtoms: 0,
        duplicateEligibleWithDna: 0,
        duplicateEligibleCoveragePct: 0
    });
}
