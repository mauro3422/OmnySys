import {
    IssueDomains,
    StandardSuggestions,
    createIssueType,
    createStandardContext,
    formatAsyncSafetyMessage
} from './guard-standards.js';

export function buildAsyncSafetyIssue({ metrics, listenerThreshold, reason }) {
    const severity = metrics.linesOfCode > listenerThreshold ? 'high' : 'medium';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'async_safety', severity);

    return {
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        issueType,
        message: formatAsyncSafetyMessage(metrics.name, reason),
        context: createStandardContext({
            guardName: 'async-safety-guard',
            atomId: metrics.id,
            atomName: metrics.name,
            metricValue: metrics.linesOfCode,
            threshold: listenerThreshold,
            severity,
            suggestedAction: StandardSuggestions.ASYNC_ADD_TRY_CATCH,
            suggestedAlternatives: [
                'Wrap network calls in try/catch blocks',
                'Add .catch() to promises with error logging',
                'Use async/await with proper error boundaries'
            ],
            extraData: {
                hasNetworkCalls: true,
                hasErrorHandling: false,
                functionType: metrics.type,
                complexity: metrics.complexity
            }
        })
    };
}

export function buildAsyncSafetyMetadataIssue({ metrics, listenerThreshold }) {
    const severity = 'low';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'async_safety', severity);

    return {
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        issueType,
        message: `Function '${metrics.name}' has ${metrics.eventListeners.length} event listeners (verify cleanup)`,
        context: createStandardContext({
            guardName: 'async-safety-guard',
            atomId: metrics.id,
            atomName: metrics.name,
            metricValue: metrics.eventListeners.length,
            threshold: listenerThreshold,
            severity,
            suggestedAction: 'Verify that event listeners are properly cleaned up',
            extraData: {
                eventListeners: metrics.eventListeners,
                eventEmitters: metrics.eventEmitters || [],
                source: 'metadata'
            }
        })
    };
}
