import { enrichConceptualFindingWithReuseOpportunities } from './duplicate-conceptual-finding.js';
import { loadLocalStructuralHash } from './duplicate-conceptual-query.js';
import {
    isActionableConceptualPeer,
    isTrivialCanonicalDelegate
} from './duplicate-conceptual-filters.js';
import { buildConceptualFinding } from './duplicate-conceptual-finding.js';

export async function evaluateConceptualDuplicateCandidate({
    repo,
    normalizedFilePath,
    localAtom,
    duplicates,
    testabilitySeverity,
    projectPath
}) {
    const localStructuralHash = loadLocalStructuralHash(repo, localAtom.id);
    const structuralVariants = duplicates.filter(
        (duplicate) => duplicate.structuralHash !== localStructuralHash
    );

    const actionableVariants = structuralVariants.filter((duplicate) =>
        isActionableConceptualPeer(localAtom, duplicate)
    );

    if (actionableVariants.length === 0) {
        return null;
    }

    if (isTrivialCanonicalDelegate(localAtom, actionableVariants)) {
        return null;
    }

    let finding = buildConceptualFinding(localAtom, actionableVariants, testabilitySeverity, projectPath);
    finding = await enrichConceptualFindingWithReuseOpportunities(projectPath, normalizedFilePath, finding);

    return finding;
}
