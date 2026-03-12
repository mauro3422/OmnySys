import {
    getDuplicateKeySqlForMode,
    DUPLICATE_MODES,
    DEFAULT_DUPLICATE_ATOM_TYPES
} from '#layer-c/storage/repository/utils/index.js';
import { runSemanticQuerySafely } from './query-utils.js';

function buildTestFilter(alias = '', excludeTests = true) {
    if (!excludeTests) {
        return '';
    }

    const prefix = alias ? `${alias}.` : '';
    return `AND ${prefix}file_path NOT LIKE '%.test.js'
           AND ${prefix}file_path NOT LIKE '%.spec.js'
           AND ${prefix}file_path NOT LIKE '%/test/%'
           AND ${prefix}file_path NOT LIKE '%/tests/%'`;
}

function buildTypeFilter(alias = '', atomTypes = []) {
    if (!atomTypes || atomTypes.length === 0) {
        return '';
    }

    const prefix = alias ? `${alias}.` : '';
    return `AND ${prefix}atom_type IN (${atomTypes.map((type) => `'${type}'`).join(',')})`;
}

function buildLiveAtomPredicate(alias = '', includeRemoved = false) {
    if (includeRemoved) {
        return '1=1';
    }

    const prefix = alias ? `${alias}.` : '';
    return `(${prefix}is_removed IS NULL OR ${prefix}is_removed = 0) AND COALESCE(${prefix}purpose_type, '') != 'REMOVED'`;
}

function buildAtomDependenciesCte() {
    return `
            WITH AtomDependencies AS (
                SELECT source_id, GROUP_CONCAT(target_id, ',') as deps_signature
                FROM (
                    SELECT source_id, target_id
                    FROM atom_relations
                    ORDER BY source_id, target_id
                )
                GROUP BY source_id
            )
    `;
}

function buildIsomorphicGroupsCte({ excludeTests, atomTypes, minLines, removedPredicate }) {
    return `
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
                  ${buildTestFilter('', excludeTests)}
                  ${buildTypeFilter('', atomTypes)}
                  AND (a.lines_of_code IS NULL OR a.lines_of_code >= ${minLines})
                  AND (${removedPredicate})
                  AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
                  AND ad.deps_signature IS NOT NULL
                GROUP BY a.is_async, a.parameter_count, ad.deps_signature
                HAVING COUNT(*) > 1
            )
    `;
}

function loadIsomorphicDuplicateRows(db, { offset, limit, excludeTests, atomTypes, minLines, removedPredicate }) {
    return db.prepare(`
        ${buildAtomDependenciesCte()},
        ${buildIsomorphicGroupsCte({ excludeTests, atomTypes, minLines, removedPredicate })}
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
          ${buildTestFilter('a', excludeTests)}
          ${buildTypeFilter('a', atomTypes)}
        ORDER BY
            ig.group_size DESC,
            (ig.group_size * COALESCE(a.importance_score, 0) * (1 + COALESCE(a.change_frequency, 0))) DESC,
            a.name ASC
        LIMIT ? OFFSET ?
    `).all(limit, offset);
}

function loadIsomorphicDuplicateStats(db, { excludeTests, atomTypes, minLines, removedPredicate }) {
    return db.prepare(`
        ${buildAtomDependenciesCte()},
        ${buildIsomorphicGroupsCte({ excludeTests, atomTypes, minLines, removedPredicate })}
        SELECT COUNT(*) as groups, SUM(group_size) as total_instances
        FROM IsomorphicGroups
    `).get();
}

export function runDuplicatesQuery(db, {
    offset = 0,
    limit = 20,
    excludeTests = true,
    minLines = 3,
    atomTypes = DEFAULT_DUPLICATE_ATOM_TYPES,
    mode = DUPLICATE_MODES.STRICT,
    includeRemoved = false
} = {}) {
    return runSemanticQuerySafely(() => {
        const duplicateKeySql = getDuplicateKeySqlForMode(mode, 'dna_json');
        const duplicateKeySqlForAlias = (alias) => getDuplicateKeySqlForMode(mode, `${alias}.dna_json`);
        const duplicateKeySqlForSelect = duplicateKeySqlForAlias('a');
        const testFilterCte = buildTestFilter('', excludeTests);
        const testFilterMain = buildTestFilter('a', excludeTests);
        const testFilterStats = buildTestFilter('a_stats', excludeTests);
        const typeFilterCte = buildTypeFilter('', atomTypes);
        const typeFilterMain = buildTypeFilter('a', atomTypes);
        const typeFilterStats = buildTypeFilter('a_stats', atomTypes);
        const removedPredicate = buildLiveAtomPredicate('', includeRemoved);
        const removedPredicateMain = buildLiveAtomPredicate('a', includeRemoved);
        const removedPredicateStats = buildLiveAtomPredicate('a_stats', includeRemoved);

        const rows = db.prepare(`
            WITH DuplicateGroups AS (
                SELECT ${duplicateKeySql} as duplicate_key, COUNT(*) as group_size
                FROM atoms
                WHERE ${removedPredicate}
                  AND (${duplicateKeySql}) IS NOT NULL
                  ${testFilterCte}
                  ${typeFilterCte}
                  AND (lines_of_code IS NULL OR lines_of_code >= ${minLines})
                GROUP BY duplicate_key
                HAVING COUNT(*) > 1
            )
            SELECT
                a.id, a.name, a.file_path, a.line_start, a.dna_json,
                ${duplicateKeySqlForSelect} as duplicate_key,
                a.lines_of_code, a.atom_type,
                a.archetype_type, a.purpose_type,
                a.change_frequency, a.importance_score,
                a.complexity,
                dg.group_size,
                (SELECT COUNT(*) FROM atoms ca
                 WHERE ca.calls_json LIKE '%' || a.name || '%'
                   AND ca.file_path != a.file_path) AS caller_count
            FROM atoms a
            JOIN DuplicateGroups dg ON (${duplicateKeySqlForAlias('a')}) = dg.duplicate_key
            WHERE ${removedPredicateMain}
              ${testFilterMain}
              ${typeFilterMain}
              AND (a.lines_of_code IS NULL OR a.lines_of_code >= ${minLines})
            ORDER BY
                (dg.group_size * COALESCE(a.importance_score, 0) * (1 + COALESCE(a.change_frequency, 0))) DESC,
                dg.group_size DESC,
                a.name ASC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        const stats = db.prepare(`
            SELECT COUNT(DISTINCT (${duplicateKeySqlForAlias('a_stats')})) groups, COUNT(*) total_instances
            FROM atoms a_stats
            WHERE ${removedPredicateStats}
              ${testFilterStats}
              ${typeFilterStats}
              AND (a_stats.lines_of_code IS NULL OR a_stats.lines_of_code >= ${minLines})
              AND (${duplicateKeySqlForAlias('a_stats')}) IN (
                  SELECT ${duplicateKeySql} FROM atoms
                  WHERE ${removedPredicate}
                    AND (${duplicateKeySql}) IS NOT NULL
                    ${testFilterCte}
                    ${typeFilterCte}
                    AND (lines_of_code IS NULL OR lines_of_code >= ${minLines})
                  GROUP BY ${duplicateKeySql}
                  HAVING COUNT(*) > 1
              )
        `).get();

        return { rows, stats: stats || { groups: 0, total_instances: 0 } };
    }, 'queryDuplicates', { rows: [], stats: { groups: 0, total_instances: 0 } });
}

export function runIsomorphicDuplicatesQuery(db, {
    offset = 0,
    limit = 20,
    excludeTests = true,
    minLines = 3,
    atomTypes = ['function', 'method', 'arrow'],
    includeRemoved = false
} = {}) {
    return runSemanticQuerySafely(() => {
        const removedPredicate = buildLiveAtomPredicate('a', includeRemoved);
        const rows = loadIsomorphicDuplicateRows(db, { offset, limit, excludeTests, atomTypes, minLines, removedPredicate });
        const stats = loadIsomorphicDuplicateStats(db, { excludeTests, atomTypes, minLines, removedPredicate });

        return { rows, stats: stats || { groups: 0, total_instances: 0 } };
    }, 'queryIsomorphicDuplicates', { rows: [], stats: { groups: 0, total_instances: 0 } });
}

export function runAtomHistoryQuery(db, { name, filePath, dnaHash, limit = 50 }) {
    return runSemanticQuerySafely(() => {
        let whereClause = '';
        const params = [];

        if (dnaHash) {
            whereClause = "WHERE json_extract(dna_json, '$.hash') = ?";
            params.push(dnaHash);
        } else if (name && filePath) {
            whereClause = 'WHERE name = ? AND file_path = ?';
            params.push(name, filePath);
        } else if (name) {
            whereClause = 'WHERE name = ?';
            params.push(name);
        } else {
            throw new Error('Debe proporcionar name/filePath o dnaHash para consultar el historial.');
        }

        return db.prepare(`
            SELECT id, name, file_path, atom_type, line_start, line_end,
                   dna_json, is_removed, updated_at, complexity,
                   importance_score, archetype_type, purpose_type
            FROM atoms
            ${whereClause}
            ORDER BY updated_at DESC, is_removed ASC
            LIMIT ?
        `).all(...params, limit);
    }, 'queryAtomHistory', []);
}

export { DEFAULT_DUPLICATE_ATOM_TYPES, DUPLICATE_MODES };
