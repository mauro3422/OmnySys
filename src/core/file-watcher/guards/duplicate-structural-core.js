import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import {
    buildDuplicateWhereSql,
    normalizeDuplicateCandidateAtom
} from '#layer-c/storage/repository/utils/index.js';
import {
    generateAlternativeNames,
    shouldIgnoreStructuralDuplicateFinding
} from '../../../shared/compiler/index.js';

export async function clearStructuralDuplicateIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'code_duplicate_high');
    await clearWatcherIssue(rootPath, filePath, 'code_duplicate_medium');
}

export function loadStructuralLocalAtoms({
    repo,
    normalizedFilePath,
    providedAtoms,
    minLinesOfCode,
    maxFindings,
    duplicateMode,
    duplicateKeySql
}) {
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

export function collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName) {
    return localAtoms
        .filter((atom) => atom.name &&
            !isLowSignalName(atom.name) &&
            !shouldIgnoreStructuralDuplicateFinding(normalizedFilePath, atom.name))
        .map((atom) => atom.duplicate_key)
        .filter(Boolean);
}

export function loadStructuralDuplicateRows(repo, candidateDnas, normalizedFilePath, duplicateKeySql) {
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

export function buildStructuralFindings(localAtoms, duplicateRows, normalizedFilePath, maxFindings) {
    const byDna = new Map();
    for (const row of duplicateRows) {
        if (!byDna.has(row.duplicate_key)) {
            byDna.set(row.duplicate_key, []);
        }
        byDna.get(row.duplicate_key).push(row);
    }

    const localDnaToName = new Map(localAtoms.map((atom) => [atom.duplicate_key, atom.name]));
    const localDnaToId = new Map(localAtoms.map((atom) => [atom.duplicate_key, atom.id]));
    const findings = [];

    for (const [dna, remoteAtoms] of byDna) {
        const symbolName = localDnaToName.get(dna) || remoteAtoms[0]?.name || '?';
        if (shouldIgnoreStructuralDuplicateFinding(normalizedFilePath, symbolName)) {
            continue;
        }

        const uniqueFiles = [...new Set(remoteAtoms.map((atom) => atom.file_path))];
        findings.push({
            symbol: symbolName,
            atomId: localDnaToId.get(dna),
            duplicateType: 'LOGIC_DUPLICATE',
            totalInstances: remoteAtoms.length + 1,
            duplicateFiles: uniqueFiles,
            sample: uniqueFiles.slice(0, 3),
            dnaSimilarity: 'structural',
            suggestedAlternatives: generateAlternativeNames(symbolName)
        });

        if (findings.length >= maxFindings) {
            break;
        }
    }

    return findings;
}
