import {
    loadConceptualDuplicateRows
} from './duplicate-conceptual-query.js';
import {
    shouldSkipConceptualAtom
} from './duplicate-conceptual-filters.js';
import { evaluateConceptualDuplicateCandidate } from './duplicate-conceptual-detect-evaluate.js';

export async function detectConceptualFindings(
    repo,
    normalizedFilePath,
    localAtoms,
    maxFindings,
    isLowSignalNameFn,
    testabilitySeverity = 'low',
    projectPath = null
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

        const finding = await evaluateConceptualDuplicateCandidate({
            repo,
            normalizedFilePath,
            localAtom,
            duplicates,
            testabilitySeverity,
            projectPath
        });

        if (!finding) {
            continue;
        }

        findings.push(finding);
        if (findings.length >= maxFindings) {
            break;
        }
    }

    return findings;
}
