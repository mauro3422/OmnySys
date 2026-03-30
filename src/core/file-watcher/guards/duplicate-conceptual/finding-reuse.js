import { detectHelperReuseOpportunities } from '../../../../shared/compiler/index.js';

export async function enrichConceptualFindingWithReuseOpportunities(projectPath, normalizedFilePath, finding) {
    if (!projectPath) {
        return finding;
    }

    try {
        const reuseOpportunities = await detectHelperReuseOpportunities(
            projectPath,
            normalizedFilePath,
            [finding]
        );

        if (reuseOpportunities.length > 0 && reuseOpportunities[0].existingHelper) {
            finding.helperReuseSuggestion = reuseOpportunities[0].existingHelper;
            finding.hasReuseOpportunity = true;
        }
    } catch {
        // Best effort only.
    }

    return finding;
}
