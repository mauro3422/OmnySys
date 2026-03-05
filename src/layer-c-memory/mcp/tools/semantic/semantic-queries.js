/**
 * @fileoverview semantic-queries.js
 *
 * Módulo de queries SQL para análisis semántico.
 * Extrae la lógica de consultas de SemanticQueryTool para separar responsabilidades.
 *
 * @module mcp/tools/semantic/semantic-queries
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:SemanticQueries');

/**
 * Helper para ejecutar queries con manejo de errores
 * @param {Function} fn - Función a ejecutar
 * @param {string} operation - Nombre de la operación para logging
 * @param {*} defaultValue - Valor por defecto en caso de error
 */
function safeQuery(fn, operation, defaultValue = null) {
    try {
        return fn();
    } catch (error) {
        logger.error(`[${operation}] Database query failed:`, error.message);
        return defaultValue;
    }
}

/**
 * Construye y ejecuta query de race conditions
 * @param {Object} db - Instancia SQLite
 * @param {Object} options 
 * @returns {{ total, races: Array }}
 */
export function queryRaceConditions(db, { offset = 0, limit = 20, scopeType, asyncOnly = true }) {
    return safeQuery(() => {
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
    }, 'queryRaceConditions', { total: 0, rows: [] });
}

/**
 * Construye y ejecuta query de event patterns
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ total, patterns: Array }}
 */
export function queryEventPatterns(db, { offset = 0, limit = 20, type = 'all' }) {
    return safeQuery(() => {
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
    }, 'queryEventPatterns', { total: 0, rows: [] });
}

/**
 * Construye y ejecuta query de funciones async
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ total, rows: Array }}
 */
export function queryAsyncAtoms(db, { offset = 0, limit = 20, withNetworkCalls = false, withErrorHandling = false }) {
    return safeQuery(() => {
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
    }, 'queryAsyncAtoms', { total: 0, rows: [] });
}

/**
 * Construye y ejecuta query de sociedades (Pueblos)
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ total, rows: Array }}
 */
export function querySocieties(db, { offset = 0, limit = 20, type }) {
    return safeQuery(() => {
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
    }, 'querySocieties', { total: 0, rows: [] });
}

/**
 * Obtiene estadísticas globales de cobertura DNA del proyecto.
 * Permite saber cuán confiable es la detección de duplicados.
 * @param {Object} db - Instancia SQLite
 * @returns {{ totalAtoms, withDna, coveragePct, srcOnlyAtoms, srcWithDna }}
 */
export function queryDnaCoverage(db) {
    return safeQuery(() => {
        const row = db.prepare(`
            SELECT
                COUNT(*) totalAtoms,
                COUNT(CASE WHEN dna_json IS NOT NULL AND dna_json != '' THEN 1 END) withDna,
                COUNT(CASE WHEN file_path NOT LIKE '%/test%' AND file_path NOT LIKE '%.test.%' AND file_path NOT LIKE '%.spec.%' THEN 1 END) srcOnlyAtoms,
                COUNT(CASE WHEN file_path NOT LIKE '%/test%' AND file_path NOT LIKE '%.test.%' AND file_path NOT LIKE '%.spec.%' AND dna_json IS NOT NULL AND dna_json != '' THEN 1 END) srcWithDna
            FROM atoms
            WHERE is_removed IS NULL OR is_removed = 0
        `).get();

        return {
            ...row,
            coveragePct: row.totalAtoms > 0 ? Math.round((row.withDna / row.totalAtoms) * 100) : 0
        };
    }, 'queryDnaCoverage', { totalAtoms: 0, withDna: 0, coveragePct: 0, srcOnlyAtoms: 0, srcWithDna: 0 });
}

/**
 * Construye y ejecuta query de duplicados por DNA hash.
 * Incluye metadata de urgencia (changeFrequency, calledBy count, archetype)
 * para rankear los grupos de mayor a menor deuda técnica real.
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ rows: Array, stats: Object }}
 */
export function queryDuplicates(db, { offset = 0, limit = 20, excludeTests = true, minLines = 3, atomTypes = ['function', 'method', 'arrow', 'class'] } = {}) {
    return safeQuery(() => {
    const testFilterCte = excludeTests
        ? `AND file_path NOT LIKE '%.test.js'
           AND file_path NOT LIKE '%.spec.js'
           AND file_path NOT LIKE '%/test/%'
           AND file_path NOT LIKE '%/tests/%'`
        : '';

    const testFilterMain = excludeTests
        ? `AND a.file_path NOT LIKE '%.test.js'
           AND a.file_path NOT LIKE '%.spec.js'
           AND a.file_path NOT LIKE '%/test/%'
           AND a.file_path NOT LIKE '%/tests/%'`
        : '';

    const typeFilterCte = atomTypes && atomTypes.length > 0
        ? `AND atom_type IN (${atomTypes.map(t => `'${t}'`).join(',')})`
        : '';

    const typeFilterMain = atomTypes && atomTypes.length > 0
        ? `AND a.atom_type IN (${atomTypes.map(t => `'${t}'`).join(',')})`
        : '';

    const rows = db.prepare(`
        WITH DuplicateGroups AS (
            SELECT dna_json, COUNT(*) as group_size
            FROM atoms
            WHERE dna_json IS NOT NULL AND dna_json != ''
              ${testFilterCte}
              ${typeFilterCte}
              AND (lines_of_code IS NULL OR lines_of_code >= ${minLines})
              AND (is_removed IS NULL OR is_removed = 0)
              AND (is_dead_code IS NULL OR is_dead_code = 0)
            GROUP BY dna_json
            HAVING COUNT(*) > 1
        )
        SELECT
            a.id, a.name, a.file_path, a.line_start, a.dna_json,
            a.lines_of_code, a.atom_type,
            a.archetype_type, a.purpose_type,
            a.change_frequency, a.importance_score,
            a.complexity,
            dg.group_size,
            (SELECT COUNT(*) FROM atoms ca
             WHERE ca.calls_json LIKE '%' || a.name || '%'
               AND ca.file_path != a.file_path) AS caller_count
        FROM atoms a
        JOIN DuplicateGroups dg ON a.dna_json = dg.dna_json
        WHERE 1=1 
        ${testFilterMain}
        ${typeFilterMain}
        ORDER BY
            (dg.group_size * COALESCE(a.importance_score, 0) * (1 + COALESCE(a.change_frequency, 0))) DESC,
            dg.group_size DESC,
            a.name ASC
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Stats globales del query
    const stats = db.prepare(`
        SELECT COUNT(DISTINCT a_stats.dna_json) groups, COUNT(*) total_instances
        FROM atoms a_stats
        WHERE a_stats.dna_json IN (
            SELECT dna_json FROM atoms
            WHERE dna_json IS NOT NULL AND dna_json != ''
              ${testFilterCte}
              ${typeFilterCte}
              AND (lines_of_code IS NULL OR lines_of_code >= ${minLines})
              AND (is_removed IS NULL OR is_removed = 0)
              AND (is_dead_code IS NULL OR is_dead_code = 0)
            GROUP BY dna_json HAVING COUNT(*) > 1
        )
        ${testFilterCte.replace(/file_path/g, 'a_stats.file_path')}
        ${typeFilterCte.replace(/atom_type/g, 'a_stats.atom_type')}
    `).get();

    return { rows, stats: stats || { groups: 0, total_instances: 0 } };
    }, 'queryDuplicates', { rows: [], stats: { groups: 0, total_instances: 0 } });
}

/**
 * Construye y ejecuta query de isomorfismo funcional.
 * Encuentra átomos que tienen el mismo is_async, parameter_count
 * y exactamente las mismas relaciones ordenadas hacia otros métodos/archivos.
 * @param {Object} db - Instancia SQLite
 * @param {Object} options
 * @returns {{ rows: Array, stats: Object }}
 */
export function queryIsomorphicDuplicates(db, { offset = 0, limit = 20, excludeTests = true, minLines = 3, atomTypes = ['function', 'method', 'arrow'] } = {}) {
    return safeQuery(() => {
    const testFilterCte = excludeTests
        ? `AND file_path NOT LIKE '%.test.js'
           AND file_path NOT LIKE '%.spec.js'
           AND file_path NOT LIKE '%/test/%'
           AND file_path NOT LIKE '%/tests/%'`
        : '';

    const testFilterMain = excludeTests
        ? `AND a.file_path NOT LIKE '%.test.js'
           AND a.file_path NOT LIKE '%.spec.js'
           AND a.file_path NOT LIKE '%/test/%'
           AND a.file_path NOT LIKE '%/tests/%'`
        : '';

    const typeFilterCte = atomTypes && atomTypes.length > 0
        ? `AND atom_type IN (${atomTypes.map(t => `'${t}'`).join(',')})`
        : '';

    const typeFilterMain = atomTypes && atomTypes.length > 0
        ? `AND a.atom_type IN (${atomTypes.map(t => `'${t}'`).join(',')})`
        : '';

    const rows = db.prepare(`
        WITH AtomDependencies AS (
            SELECT 
                source_id, 
                GROUP_CONCAT(target_id, ',') as deps_signature
            FROM (
                SELECT source_id, target_id
                FROM atom_relations
                ORDER BY source_id, target_id
            )
            GROUP BY source_id
        ),
        IsomorphicGroups AS (
            SELECT 
                a.is_async, 
                a.parameter_count, 
                ad.deps_signature,
                (CAST(a.is_async AS TEXT) || '|' || CAST(a.parameter_count AS TEXT) || '|' || COALESCE(ad.deps_signature, 'none')) as isomorphic_hash,
                COUNT(*) as group_size
            FROM atoms a
            LEFT JOIN AtomDependencies ad ON a.id = ad.source_id
            WHERE 1=1
              ${testFilterCte}
              ${typeFilterCte}
              AND (a.lines_of_code IS NULL OR a.lines_of_code >= ${minLines})
              AND (a.is_removed IS NULL OR a.is_removed = 0)
              AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
              -- Exclude standard getter/setter properties and empty functions
              AND ad.deps_signature IS NOT NULL
            GROUP BY 
                a.is_async, 
                a.parameter_count, 
                ad.deps_signature
            HAVING COUNT(*) > 1
        )
        SELECT 
            a.id, a.name, a.file_path, a.line_start, 
            a.lines_of_code, a.atom_type,
            a.archetype_type, a.purpose_type,
            a.change_frequency, a.importance_score,
            a.complexity,
            ig.isomorphic_hash,
            ig.group_size,
            (SELECT COUNT(*) FROM atoms ca
             WHERE ca.calls_json LIKE '%' || a.name || '%'
               AND ca.file_path != a.file_path) AS caller_count
        FROM atoms a
        LEFT JOIN AtomDependencies ad ON a.id = ad.source_id
        JOIN IsomorphicGroups ig ON 
            a.is_async = ig.is_async AND 
            a.parameter_count = ig.parameter_count AND 
            (ad.deps_signature = ig.deps_signature OR (ad.deps_signature IS NULL AND ig.deps_signature IS NULL))
        WHERE 1=1 
        ${testFilterMain}
        ${typeFilterMain}
        ORDER BY 
            ig.group_size DESC,
            (ig.group_size * COALESCE(a.importance_score, 0) * (1 + COALESCE(a.change_frequency, 0))) DESC,
            a.name ASC
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Global stats
    const stats = db.prepare(`
        WITH AtomDependencies AS (
            SELECT 
                source_id, 
                GROUP_CONCAT(target_id, ',') as deps_signature
            FROM (
                SELECT source_id, target_id
                FROM atom_relations
                ORDER BY source_id, target_id
            )
            GROUP BY source_id
        ),
        IsomorphicGroups AS (
            SELECT 
                a.is_async, 
                a.parameter_count, 
                ad.deps_signature,
                COUNT(*) as group_size
            FROM atoms a
            LEFT JOIN AtomDependencies ad ON a.id = ad.source_id
            WHERE 1=1
              ${testFilterCte.replace(/file_path/g, 'a.file_path')}
              ${typeFilterCte.replace(/atom_type/g, 'a.atom_type')}
              AND (a.lines_of_code IS NULL OR a.lines_of_code >= ${minLines})
              AND (a.is_removed IS NULL OR a.is_removed = 0)
              AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
              AND ad.deps_signature IS NOT NULL
            GROUP BY a.is_async, a.parameter_count, ad.deps_signature
            HAVING COUNT(*) > 1
        )
        SELECT 
            COUNT(*) as groups, 
            SUM(group_size) as total_instances
        FROM IsomorphicGroups
    `).get();

    return { rows, stats: stats || { groups: 0, total_instances: 0 } };
    }, 'queryIsomorphicDuplicates', { rows: [], stats: { groups: 0, total_instances: 0 } });
}
