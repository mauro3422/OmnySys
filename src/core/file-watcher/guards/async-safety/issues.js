import {
    IssueDomains,
    StandardSuggestions,
    createIssueType,
    createStandardContext,
    formatAsyncSafetyMessage
} from '../guard-standards.js';
import {
    buildPropagationPlan,
    summarizePropagationPlan
} from '../../../../shared/compiler/index.js';

function buildAsyncSafetyPropagation({ metrics, severity, reason, listenerThreshold }) {
    return summarizePropagationPlan(buildPropagationPlan({
        changeType: 'policy_drift',
        scopePath: metrics.filePath || null,
        focusPath: metrics.filePath || null,
        severity,
        impactedFileCount: 1,
        rewriteCount: 1,
        candidateCount: 1,
        validationTargetCount: 1,
        topCandidates: [{
            name: metrics.name,
            filePath: metrics.filePath || null
        }],
        topImpactedFiles: metrics.filePath ? [{ filePath: metrics.filePath }] : [],
        guidance: 'Surface async-safety findings to watcher persistence, health snapshots, and drift governance before trusting runtime recovery paths.',
        recommendationStrategy: 'async_safety',
        drift: {
            state: 'watch',
            reason: reason || 'async safety finding'
        }
    }));
}

export function buildAsyncSafetyIssue({ metrics, listenerThreshold, reason }) {
    const severity = metrics.linesOfCode > listenerThreshold ? 'high' : 'medium';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'async_safety', severity);
    const propagation = buildAsyncSafetyPropagation({ metrics, severity, reason, listenerThreshold });

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
                complexity: metrics.complexity,
                propagation
            }
        })
    };
}

export function buildAsyncSafetyMetadataIssue({ metrics, listenerThreshold }) {
    const severity = 'low';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'async_safety', severity);
    const propagation = buildAsyncSafetyPropagation({
        metrics,
        severity,
        reason: 'async event-listener cleanup verification',
        listenerThreshold
    });

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
                source: 'metadata',
                propagation
            }
        })
    };
}
