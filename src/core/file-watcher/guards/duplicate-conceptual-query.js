import { clearUnifiedDuplicateIssues } from './unified-duplicate-guard-helpers.js';

export function clearConceptualDuplicateIssues(rootPath, normalizedFilePath) {
    return clearUnifiedDuplicateIssues(rootPath, normalizedFilePath);
}

export function loadConceptualLocalAtoms(repo, normalizedFilePath, minLinesOfCode) {
    if (!repo?.db || repo.db.open === false) {
        return [];
    }

    const rows = repo.db.prepare(`
        SELECT id, name, atom_type, purpose_type, lines_of_code, is_exported,
               json_extract(dna_json, '$.semanticFingerprint') as semanticFingerprint
        FROM atoms
        WHERE file_path = ?
          AND atom_type IN ('function', 'method', 'arrow')
          AND (is_removed IS NULL OR is_removed = 0)
          AND (is_dead_code IS NULL OR is_dead_code = 0)
          AND lines_of_code >= ?
          AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
          AND json_extract(dna_json, '$.semanticFingerprint') != 'unknown:unknown:unknown'
    `).all(normalizedFilePath, minLinesOfCode);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        filePath: normalizedFilePath,
        semanticFingerprint: row.semanticFingerprint,
        purposeType: row.purpose_type,
        linesOfCode: row.lines_of_code,
        isExported: row.is_exported === 1
    }));
}

export function loadConceptualDuplicateRows(repo, normalizedFilePath, fingerprint) {
    if (!repo?.db || repo.db.open === false) {
        return [];
    }

    return repo.db.prepare(`
        SELECT a.name, a.file_path, a.purpose_type, a.lines_of_code, a.is_exported,
               json_extract(a.dna_json, '$.structuralHash') as structuralHash
        FROM atoms a
        WHERE a.file_path != ?
          AND json_extract(a.dna_json, '$.semanticFingerprint') = ?
          AND a.atom_type IN ('function', 'method', 'arrow')
          AND (a.is_removed IS NULL OR a.is_removed = 0)
          AND (a.is_dead_code IS NULL OR a.is_dead_code = 0)
        ORDER BY a.file_path
        LIMIT 10
    `).all(normalizedFilePath, fingerprint);
}

export function loadLocalStructuralHash(repo, atomId) {
    if (!repo?.db || repo.db.open === false) {
        return null;
    }

    return repo.db.prepare(`
        SELECT json_extract(dna_json, '$.structuralHash') as sh
        FROM atoms WHERE id = ?
    `).get(atomId)?.sh;
}
