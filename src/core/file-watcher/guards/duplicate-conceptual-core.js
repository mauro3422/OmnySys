import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import {
    generateAlternativeNames,
    shouldIgnoreConceptualDuplicateFinding
} from '../../../shared/compiler/index.js';

export function clearConceptualDuplicateIssues(rootPath, normalizedFilePath) {
    return Promise.all([
        clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_high'),
        clearWatcherIssue(rootPath, normalizedFilePath, 'code_conceptual_duplicate_medium')
    ]);
}

export function loadConceptualLocalAtoms(repo, normalizedFilePath, minLinesOfCode) {
    const rows = repo.db.prepare(`
        SELECT id, name, atom_type, lines_of_code, is_exported,
               json_extract(dna_json, '$.semanticFingerprint') as semanticFingerprint
        FROM atoms
        WHERE file_path = ?
          AND atom_type IN ('function', 'method', 'arrow')
          AND (is_removed IS NULL OR is_removed = 0)
          AND lines_of_code >= ?
          AND json_extract(dna_json, '$.semanticFingerprint') IS NOT NULL
          AND json_extract(dna_json, '$.semanticFingerprint') != 'unknown:unknown:unknown'
    `).all(normalizedFilePath, minLinesOfCode);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        semanticFingerprint: row.semanticFingerprint,
        linesOfCode: row.lines_of_code,
        isExported: row.is_exported === 1
    }));
}

export function shouldSkipConceptualAtom(
    normalizedFilePath,
    localAtom,
    isLowSignalNameFn
) {
    if (isLowSignalNameFn(localAtom.name)) {
        return true;
    }

    const fingerprint = localAtom.semanticFingerprint;
    if (
        fingerprint.includes(':unknown') ||
        fingerprint.includes(':_callback') ||
        fingerprint.includes(':constructor')
    ) {
        return true;
    }

    return shouldIgnoreConceptualDuplicateFinding(normalizedFilePath, localAtom.name, fingerprint);
}

export function loadConceptualDuplicateRows(repo, normalizedFilePath, fingerprint) {
    return repo.db.prepare(`
        SELECT a.name, a.file_path, a.lines_of_code, a.is_exported,
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
    return repo.db.prepare(`
        SELECT json_extract(dna_json, '$.structuralHash') as sh
        FROM atoms WHERE id = ?
    `).get(atomId)?.sh;
}

export function buildConceptualFinding(localAtom, structuralVariants, testabilitySeverity = 'low') {
    const uniqueFiles = [...new Set(structuralVariants.map((duplicate) => duplicate.file_path))];

    return {
        symbol: localAtom.name,
        atomId: localAtom.id,
        semanticFingerprint: localAtom.semanticFingerprint,
        duplicateType: 'CONCEPTUAL_DUPLICATE',
        totalInstances: structuralVariants.length + 1,
        duplicateFiles: uniqueFiles,
        duplicateNames: [...new Set(structuralVariants.map((duplicate) => duplicate.name))],
        sample: uniqueFiles.slice(0, 3),
        isExported: localAtom.isExported,
        existingExports: structuralVariants.filter((duplicate) => duplicate.is_exported).length,
        testabilitySeverity,
        suggestedAlternatives: generateAlternativeNames(localAtom.name, structuralVariants[0]?.name)
    };
}

export function detectConceptualFindings(
    repo,
    normalizedFilePath,
    localAtoms,
    maxFindings,
    isLowSignalNameFn,
    testabilitySeverity = 'low'
) {
    const findings = [];

    for (const localAtom of localAtoms) {
        if (shouldSkipConceptualAtom(normalizedFilePath, localAtom, isLowSignalNameFn)) {
            continue;
        }

        const duplicates = loadConceptualDuplicateRows(
            repo,
            normalizedFilePath,
            localAtom.semanticFingerprint
        );

        if (duplicates.length === 0) {
            continue;
        }

        const localStructuralHash = loadLocalStructuralHash(repo, localAtom.id);
        const structuralVariants = duplicates.filter(
            (duplicate) => duplicate.structuralHash !== localStructuralHash
        );

        if (structuralVariants.length === 0) {
            continue;
        }

        findings.push(buildConceptualFinding(localAtom, structuralVariants, testabilitySeverity));
        if (findings.length >= maxFindings) {
            break;
        }
    }

    return findings;
}
