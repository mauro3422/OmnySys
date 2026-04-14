import {
    parsePersistedField
} from '#shared/compiler/index.js';

export function sumMissingOptionalFields(db, fields) {
    return fields.reduce((total, field) => {
        const count = db.prepare(`
            SELECT COUNT(*) as count FROM atoms
            WHERE (is_removed IS NULL OR is_removed = 0)
              AND (${field} IS NULL OR ${field} = '')
        `).get().count;
        return total + count;
    }, 0);
}

export function auditWatcherIssues(recentIssues) {
    return recentIssues.reduce((summary, issue) => {
        try {
            const context = parsePersistedField(issue.context_json, {});
            const lifecycleStatus = context.lifecycle?.status || 'unknown';
            if (!context.lifecycle || lifecycleStatus === 'unknown') {
                summary.withoutLifecycle++;
            }
            if (!context.suggestedAction && lifecycleStatus === 'active') {
                summary.withoutContext++;
            }
        } catch {
            summary.withoutLifecycle++;
            summary.withoutContext++;
        }
        return summary;
    }, { withoutLifecycle: 0, withoutContext: 0 });
}

export function loadRecentWatcherIssues(db, limit = 1000) {
    return db.prepare(`
        SELECT id, issue_type, severity, file_path, context_json, detected_at
        FROM semantic_issues
        WHERE message LIKE '[watcher]%'
          AND (is_removed IS NULL OR is_removed = 0)
        ORDER BY detected_at DESC
        LIMIT ?
    `).all(limit);
}

export function countOrphanedWatcherIssues(db) {
    return db.prepare(`
        SELECT COUNT(*) as count
        FROM semantic_issues si
        LEFT JOIN atoms a ON si.file_path = a.file_path
        WHERE si.message LIKE '[watcher]%'
          AND (a.file_path IS NULL OR a.is_removed = 1)
          AND (si.lifecycle_status IS NULL OR si.lifecycle_status != 'expired')
          AND (si.is_removed IS NULL OR si.is_removed = 0)
    `).get().count;
}

export function getWatcherLifecycleDistribution(db) {
    return db.prepare(`
        SELECT 
            SUM(CASE WHEN lifecycle_status = 'active' OR lifecycle_status IS NULL THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN lifecycle_status = 'expired' THEN 1 ELSE 0 END) as expired,
            SUM(CASE WHEN lifecycle_status = 'superseded' THEN 1 ELSE 0 END) as superseded
        FROM semantic_issues
        WHERE message LIKE '[watcher]%'
    `).get();
}

export function collectOrphanCounts(db) {
    return {
        atomsWithoutFile: db.prepare(`
            SELECT COUNT(*) as count
            FROM atoms a
            LEFT JOIN files f ON a.file_path = f.path
            WHERE (f.path IS NULL OR f.is_removed = 1)
              AND (a.is_removed IS NULL OR a.is_removed = 0)
        `).get().count,
        relationsWithoutAtoms: db.prepare(`
            SELECT COUNT(*) as count
            FROM atom_relations ar
            LEFT JOIN atoms src ON ar.source_id = src.id
            LEFT JOIN atoms tgt ON ar.target_id = tgt.id
            WHERE (
                src.id IS NULL OR src.is_removed = 1 OR
                tgt.id IS NULL OR tgt.is_removed = 1
            )
              AND (ar.is_removed IS NULL OR ar.is_removed = 0)
        `).get().count,
        issuesWithoutFile: db.prepare(`
            SELECT COUNT(*) as count
            FROM semantic_issues si
            LEFT JOIN files f ON si.file_path = f.path
            WHERE (f.path IS NULL OR f.is_removed = 1)
              AND (si.is_removed IS NULL OR si.is_removed = 0)
              AND si.file_path != 'project-wide'
        `).get().count
    };
}

export function loadRelationSample(db, sampleSize) {
    return db.prepare(`
        SELECT ar.id, ar.source_id, ar.target_id
        FROM atom_relations ar
        INNER JOIN atoms src ON ar.source_id = src.id AND COALESCE(src.is_removed, 0) = 0
        INNER JOIN atoms tgt ON ar.target_id = tgt.id AND COALESCE(tgt.is_removed, 0) = 0
        WHERE ar.relation_type = 'calls'
          AND COALESCE(ar.is_removed, 0) = 0
        LIMIT ?
    `).all(sampleSize);
}

export function checkRelationSample(db, sampleAtoms) {
    let inconsistencies = 0;
    let checked = 0;

    const atomLookup = db.prepare(`
        SELECT id
        FROM atoms
        WHERE id = ?
          AND COALESCE(is_removed, 0) = 0
    `);

    for (const relation of sampleAtoms) {
        const sourceAtom = atomLookup.get(relation.source_id);
        const targetAtom = atomLookup.get(relation.target_id);

        checked++;

        if (!sourceAtom || !targetAtom) {
            inconsistencies++;
        }
    }

    return { checked, inconsistencies };
}
