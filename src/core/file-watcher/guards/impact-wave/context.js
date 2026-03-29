import {
    StandardSuggestions,
    StandardThresholds,
    createStandardContext
} from '../guard-standards.js';

export function buildImpactWaveIssueContext({
    severity,
    score,
    focusedAtoms,
    focusedAtomIds,
    relatedFiles,
    brokenImports,
    brokenCallers,
    maxRelatedFiles,
    maxBrokenSamples
}) {
    const hasBreakingChanges = brokenCallers.length > 0 || brokenImports.length > 0;

    return createStandardContext({
        guardName: 'impact-wave-guard',
        severity,
        metricValue: score,
        threshold: severity === 'high' ? StandardThresholds.IMPACT_HIGH :
            (severity === 'medium' ? StandardThresholds.IMPACT_MEDIUM : StandardThresholds.IMPACT_LOW),
        suggestedAction: hasBreakingChanges
            ? StandardSuggestions.IMPACT_BREAKING
            : StandardSuggestions.IMPACT_REVIEW,
        suggestedAlternatives: hasBreakingChanges ? [
            'Add backward compatibility layer',
            'Update all callers before deploying',
            'Use atomic_edit to fix broken callers'
        ] : [
            'Review changes in related files',
            'Run integration tests',
            'Check for unexpected side effects'
        ],
        relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
        extraData: {
            score,
            changedAtoms: focusedAtoms.length,
            changedAtomIds: focusedAtomIds,
            relatedFiles: Math.min(relatedFiles.size, maxRelatedFiles),
            brokenImports: brokenImports.length,
            brokenCallers: brokenCallers.length,
            sample: {
                atoms: focusedAtoms.slice(0, 8),
                relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
                brokenImports: brokenImports.slice(0, maxBrokenSamples).map((item) => item.import),
                brokenCallers: brokenCallers.slice(0, maxBrokenSamples).map((caller) => ({
                    file: caller.file,
                    line: caller.line,
                    symbol: caller.symbol || caller.name || null
                }))
            }
        }
    });
}
