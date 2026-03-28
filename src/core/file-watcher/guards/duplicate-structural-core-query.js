import {
    buildDuplicateWhereSql,
    normalizeDuplicateCandidateAtom
} from '#layer-c/storage/repository/utils/index.js';

export function loadStructuralLocalAtoms({
    repo,
    normalizedFilePath,
    providedAtoms,
    minLinesOfCode,
    maxFindings,
    duplicateMode,
    duplicateKeySql
}) {
    if (!repo?.db || repo.db.open === false) {
        return [];
    }

    if (providedAtoms && Array.isArray(providedAtoms)) {
        const normalizedAtoms = providedAtoms
            .map((atom) => normalizeDuplicateCandidateAtom(atom, {
                mode: duplicateMode,
                minLines: minLinesOfCode,
                requireDna: true
            }))
            .filter(Boolean);

        if (normalizedAtoms.length > 0) {
            return normalizedAtoms;
        }
    }

    return repo.db.prepare(`
        SELECT id, name, dna_json, lines_of_code,
               ${duplicateKeySql} AS duplicate_key
        FROM atoms
        ${buildDuplicateWhereSql({
            alias: 'a',
            minLines: minLinesOfCode,
            requireValidDna: true
        })} AND a.file_path = ?
        LIMIT ?
    `.replaceAll('FROM atoms', 'FROM atoms a')).all(normalizedFilePath, maxFindings * 4);
}

export function loadStructuralDuplicateRows(repo, candidateDnas, normalizedFilePath, duplicateKeySql) {
    if (!repo?.db || repo.db.open === false) {
        return [];
    }

    const placeholders = candidateDnas.map(() => '?').join(',');
    return repo.db.prepare(`
        SELECT a.name, a.file_path, a.dna_json, a.line_start,
               ${duplicateKeySql} AS duplicate_key
        FROM atoms a
        WHERE (${duplicateKeySql}) IN (${placeholders})
            AND a.file_path != ?
            AND ${buildDuplicateWhereSql({
                alias: 'a',
                requireValidDna: false
            }).replace(/^WHERE /, '').replace(/\n/g, '\n                AND ')}
        ORDER BY a.dna_json, a.file_path
    `).all(...candidateDnas, normalizedFilePath);
}
