import { getValidDnaPredicate, getDuplicateEligiblePredicate } from '../../../../storage/repository/utils/duplicate-dna.js';

export function loadDuplicateGroups(db) {
    const validDna = getValidDnaPredicate();
    const eligible = getDuplicateEligiblePredicate();

    return db.prepare(`
        SELECT dna_json as duplicate_key, COUNT(*) as group_size
        FROM atoms
        WHERE ${validDna}
          AND ${eligible}
        GROUP BY dna_json
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 10
    `).all().map((row) => ({
        groupSize: row.group_size,
        urgencyScore: row.group_size,
        instances: []
    }));
}
