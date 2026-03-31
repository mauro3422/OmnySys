import { generateAlternativeNames, shouldIgnoreStructuralDuplicateFinding } from '../../../../shared/compiler/index.js';

export function collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName) {
    return localAtoms
        .filter((atom) => atom.name &&
            !isLowSignalName(atom.name) &&
            !shouldIgnoreStructuralDuplicateFinding(normalizedFilePath, atom.name))
        .map((atom) => atom.duplicate_key)
        .filter(Boolean);
}

/**
 * Verifica si dos átomos son realmente duplicados comparando metadatos adicionales.
 * Extensible: agregar más verificaciones aquí cuando tengamos más datos.
 */
function areAtomsReallyDuplicate(localAtom, remoteAtom) {
    const checks = [
        { field: 'inputCount', threshold: null },
        { field: 'hasReturnValue', threshold: null },
        { field: 'isPure', threshold: null },
        { field: 'complexityScore', threshold: 0.5, mode: 'ratio' },
        { field: 'lines_of_code', threshold: 3, mode: 'ratio' }
    ];

    for (const { field, threshold, mode } of checks) {
        const local = localAtom[field];
        const remote = remoteAtom[field];
        
        if (local === undefined || remote === undefined) continue;
        
        if (mode === 'ratio') {
            const max = Math.max(local, remote);
            const min = Math.min(local, remote);
            if (min > 0 && max / min > threshold) return false;
        } else if (local !== remote) {
            return false;
        }
    }

    // TODO: Agregar más verificaciones aquí cuando tengamos más metadatos
    return true;
}

export function buildStructuralFindings(localAtoms, duplicateRows, normalizedFilePath, maxFindings) {
    const byDna = new Map();
    for (const row of duplicateRows) {
        if (!byDna.has(row.duplicate_key)) {
            byDna.set(row.duplicate_key, []);
        }
        byDna.get(row.duplicate_key).push(row);
    }

    const localDnaToAtom = new Map(localAtoms.map((atom) => [atom.duplicate_key, atom]));
    const findings = [];

    for (const [dna, remoteAtoms] of byDna) {
        const localAtom = localDnaToAtom.get(dna);
        const symbolName = localAtom?.name || remoteAtoms[0]?.name || '?';
        
        if (shouldIgnoreStructuralDuplicateFinding(normalizedFilePath, symbolName)) {
            continue;
        }

        // Filtrar remote atoms que no son realmente duplicados
        const trulyDuplicateAtoms = remoteAtoms.filter((remoteAtom) => 
            areAtomsReallyDuplicate(localAtom || {}, remoteAtom)
        );

        if (trulyDuplicateAtoms.length === 0) {
            continue;
        }

        const uniqueFiles = [...new Set(trulyDuplicateAtoms.map((atom) => atom.file_path))];
        findings.push({
            symbol: symbolName,
            atomId: localAtom?.id,
            duplicateType: 'LOGIC_DUPLICATE',
            totalInstances: trulyDuplicateAtoms.length + 1,
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
