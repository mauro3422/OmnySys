import { generateAlternativeNames, shouldIgnoreStructuralDuplicateFinding } from '../../../shared/compiler/index.js';

export function collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName) {
    return localAtoms
        .filter((atom) => atom.name &&
            !isLowSignalName(atom.name) &&
            !shouldIgnoreStructuralDuplicateFinding(normalizedFilePath, atom.name))
        .map((atom) => atom.duplicate_key)
        .filter(Boolean);
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
