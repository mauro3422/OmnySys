import {
    IssueDomains,
    StandardSuggestions,
    createIssueType,
    createStandardContext,
    severityFromSharedState
} from './guard-standards.js';

export function resolveSharedStateContentionSeverity(sharedStateSummary, criticalThreshold) {
    let severity = severityFromSharedState(sharedStateSummary.maxContention);
    if (!severity && sharedStateSummary.totalLinks > criticalThreshold * 1.5) {
        severity = 'low';
    }

    return severity;
}

export function buildSharedStateContentionIssue({
    hotAtom,
    maxContention,
    totalContention,
    severity,
    contentionThreshold,
    criticalThreshold,
    atomCount,
    sharedStateSummary
}) {
    let message;
    let suggestedAction;

    if (severity === 'high') {
        message = `Radioactive Atom detected: '${hotAtom?.name}' shares state with ${maxContention} other atoms. High risk of side effects and race conditions.`;
        suggestedAction = StandardSuggestions.SHARED_STATE_EXTRACT + ' (critical - immediate attention needed)';
    } else if (severity === 'medium') {
        message = `High State Contention: '${hotAtom?.name}' has ${maxContention} shared state dependencies. Consider refactoring to local state.`;
        suggestedAction = StandardSuggestions.SHARED_STATE_LOCAL;
    } else {
        message = `Diffuse State Contention: File has ${totalContention} total shared state links. High global coupling.`;
        suggestedAction = 'Review architecture for excessive shared state usage';
    }

    const context = createStandardContext({
        guardName: 'shared-state-guard',
        atomId: hotAtom?.id,
        atomName: hotAtom?.name,
        metricValue: maxContention,
        threshold: severity === 'high' ? criticalThreshold : contentionThreshold,
        severity,
        suggestedAction,
        suggestedAlternatives: [
            StandardSuggestions.SHARED_STATE_LOCAL,
            StandardSuggestions.SHARED_STATE_EXTRACT,
            'Use dependency injection to reduce coupling',
            'Consider immutable state patterns'
        ],
        extraData: {
            maxContention: sharedStateSummary.maxContention,
            totalContention: sharedStateSummary.totalLinks,
            contentionThreshold,
            criticalThreshold,
            atomCount,
            hottestKey: sharedStateSummary.hottestKey
        }
    });

    const issueType = createIssueType(IssueDomains.SEM, 'shared_state', severity);

    return { issueType, message, context };
}
