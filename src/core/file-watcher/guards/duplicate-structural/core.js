import { loadStructuralLocalAtoms, loadStructuralDuplicateRows } from './query.js';
import { collectCandidateDnas, buildStructuralFindings } from './findings.js';
import { isLowSignalName } from '../guard-standards.js';
import { clearUnifiedDuplicateIssues } from '../unified-duplicate-guard/helpers.js';

export async function clearStructuralDuplicateIssues(rootPath, filePath) {
    await clearUnifiedDuplicateIssues(rootPath, filePath);
}

export {
    loadStructuralLocalAtoms,
    loadStructuralDuplicateRows,
    collectCandidateDnas,
    buildStructuralFindings
};

export function runStructuralDuplicateDetection({
    repo,
    normalizedFilePath,
    providedAtoms,
    minLinesOfCode,
    maxFindings,
    duplicateMode,
    duplicateKeySql
}) {
    const localAtoms = loadStructuralLocalAtoms({
        repo,
        normalizedFilePath,
        providedAtoms,
        minLinesOfCode,
        maxFindings,
        duplicateMode,
        duplicateKeySql
    });

    if (localAtoms.length === 0) {
        return [];
    }

    const candidateDnas = collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName);
    if (candidateDnas.length === 0) {
        return [];
    }

    const duplicateRows = loadStructuralDuplicateRows(repo, candidateDnas, normalizedFilePath, duplicateKeySql);
    if (duplicateRows.length === 0) {
        return [];
    }

    return buildStructuralFindings(localAtoms, duplicateRows, normalizedFilePath, maxFindings);
}
