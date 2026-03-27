import {
    IssueDomains,
    StandardSuggestions,
    createIssueType,
    createStandardContext,
    formatEventLeakMessage
} from './guard-standards.js';

export function buildEventLeakIssue({ metrics, listenerAnalysis, listenerThreshold }) {
    const severity = listenerAnalysis.listenerCount >= listenerThreshold * 2 ? 'high' : 'medium';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'event_leak', severity);
    const suggestions = [StandardSuggestions.EVENT_ADD_CLEANUP];

    if (listenerAnalysis.usesOnce) {
        suggestions.push(StandardSuggestions.EVENT_USE_ONCE);
    }

    return {
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        issueType,
        message: formatEventLeakMessage(metrics.name, listenerAnalysis.listenerCount),
        context: createStandardContext({
            guardName: 'event-leak-guard',
            atomId: metrics.id,
            atomName: metrics.name,
            metricValue: listenerAnalysis.listenerCount,
            threshold: listenerThreshold,
            severity,
            suggestedAction: StandardSuggestions.EVENT_ADD_CLEANUP,
            suggestedAlternatives: suggestions,
            extraData: {
                listenerCount: listenerAnalysis.listenerCount,
                hasCleanup: listenerAnalysis.hasCleanup,
                usesOnce: listenerAnalysis.usesOnce,
                eventNames: listenerAnalysis.eventNames,
                missingCleanupFor: listenerAnalysis.missingCleanupFor,
                source: 'code'
            }
        })
    };
}

export function buildEventLeakMetadataIssue({ metrics, listenerThreshold }) {
    const severity = 'low';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'event_leak', severity);

    return {
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        issueType,
        message: `Function '${metrics.name}' has ${metrics.eventListeners.length} event listeners (verify cleanup)`,
        context: createStandardContext({
            guardName: 'event-leak-guard',
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
