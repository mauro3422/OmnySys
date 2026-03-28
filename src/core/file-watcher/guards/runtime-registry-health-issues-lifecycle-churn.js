import { IssueDomains, createIssueType, createStandardContext } from './guard-standards.js';

export function buildInitializationChurnIssue({ filePath, initCalls, lastInitTime }) {
    const severity = 'medium';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_churn', severity);

    return {
        severity,
        issueType,
        check: 'initialization_churn',
        message: `Registry initialized ${initCalls} times (possible reload churn)`,
        context: createStandardContext({
            guardName: 'runtime-registry-health-guard',
            metricValue: initCalls,
            threshold: 3,
            severity,
            suggestedAction: 'Review initialization patterns. Consider if initializeDefaultGuards() is being called too often.',
            suggestedAlternatives: [
                'Add initialized flag check at entry points',
                'Use singleton pattern with proper lifecycle',
                'Defer initialization to first actual use'
            ],
            extraData: {
                registryFile: filePath,
                initCalls,
                lastInitTime,
                timeSinceLastInit: Date.now() - lastInitTime
            }
        })
    };
}
