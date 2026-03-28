import { isLowSignalName } from '../guard-standards.js';
import { detectConceptualFindings } from '../duplicate-conceptual-core.js';

export async function detectConceptualDuplicateFindings({
    repo,
    normalizedFilePath,
    localAtoms,
    maxFindings,
    projectPath = null
}) {
    return detectConceptualFindings(
        repo,
        normalizedFilePath,
        localAtoms,
        maxFindings,
        isLowSignalName,
        'low',
        projectPath
    );
}
