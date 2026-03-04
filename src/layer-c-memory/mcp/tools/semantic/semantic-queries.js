/**
 * @fileoverview semantic-queries.js
 *
 * Módulo de queries SQL para análisis semántico.
 * Extrae la lógica de consultas de SemanticQueryTool para separar responsabilidades.
 *
 * @module mcp/tools/semantic/semantic-queries
 */

/**
 * Construye y ejecuta query de race conditions
 * @param {Object} db - Instancia SQLite
 * @param {Object} options 
 * @returns {{ total, races: Array }}
 */
export function queryRaceConditions(db, { offset = 0, limit = 20, scopeType, asyncOnly = true }) {
    let whereClause = "WHERE shared_state_json IS NOT NULL AND shared_state_json != '[]'";
    const params = [];

    if (asyncOnly) whereClause += ' AND is_async = 1';
    if (scopeType) { whereClause += ' AND scope_type = ?'; params.push(scopeType); }

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
}

/**
 * Construye y ejecuta query de event patterns
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ total, patterns: Array }}
 */
export function queryEventPatterns(db, { offset = 0, limit = 20, type = 'all' }) {
    const conditions = [];
    if (type === 'emitters' || type === 'all')
        conditions.push("(event_emitters_json IS NOT NULL AND event_emitters_json != '[]')");
    if (type === 'listeners' || type === 'all')
        conditions.push("(event_listeners_json IS NOT NULL AND event_listeners_json != '[]')");

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';

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
}

/**
 * Construye y ejecuta query de funciones async
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ total, rows: Array }}
 */
export function queryAsyncAtoms(db, { offset = 0, limit = 20, withNetworkCalls = false, withErrorHandling = false }) {
    let whereClause = 'WHERE is_async = 1';
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
}

/**
 * Construye y ejecuta query de sociedades (Pueblos)
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ total, rows: Array }}
 */
export function querySocieties(db, { offset = 0, limit = 20, type }) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (type) { whereClause += ' AND type = ?'; params.push(type); }

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
}

/**
 * Construye y ejecuta query de duplicados por DNA hash
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ rows: Array }}
 */
export function queryDuplicates(db, { offset = 0, limit = 20 }) {
    return db.prepare(`
        WITH DuplicateGroups AS (
            SELECT dna_json, COUNT(*) as group_size
            FROM atoms
            WHERE dna_json IS NOT NULL AND dna_json != ''
            GROUP BY dna_json
            HAVING COUNT(*) > 1
        )
        SELECT a.id, a.name, a.file_path, a.line_start, a.dna_json, dg.group_size
        FROM atoms a
        JOIN DuplicateGroups dg ON a.dna_json = dg.dna_json
        ORDER BY dg.group_size DESC, a.name ASC
        LIMIT ? OFFSET ?
    `).all(limit, offset);
}
