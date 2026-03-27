import { enrichConceptualFindingWithReuseOpportunities } from './duplicate-conceptual-finding.js';
import {
    loadConceptualDuplicateRows,
    loadLocalStructuralHash
} from './duplicate-conceptual-query.js';
import {
    isActionableConceptualPeer,
    isTrivialCanonicalDelegate,
    shouldSkipConceptualAtom
} from './duplicate-conceptual-filters.js';
import { buildConceptualFinding } from './duplicate-conceptual-finding.js';

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

        const localStructuralHash = loadLocalStructuralHash(repo, localAtom.id);
        const structuralVariants = duplicates.filter(
            (duplicate) => duplicate.structuralHash !== localStructuralHash
        );

        const actionableVariants = structuralVariants.filter((duplicate) =>
            isActionableConceptualPeer(localAtom, duplicate)
        );

        if (actionableVariants.length === 0) {
            continue;
        }

        if (isTrivialCanonicalDelegate(localAtom, actionableVariants)) {
            continue;
        }

        let finding = buildConceptualFinding(localAtom, actionableVariants, testabilitySeverity, projectPath);
        finding = await enrichConceptualFindingWithReuseOpportunities(projectPath, normalizedFilePath, finding);

        findings.push(finding);
        if (findings.length >= maxFindings) {
            break;
        }
    }

    return findings;
}
