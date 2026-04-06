import { IssueDomains, createIssueType, createStandardContext } from '../../guard-standards.js';

export function buildSlowInitializationIssue({ filePath, timeInInit, hasInitPromise, isInitialized }) {
    const severity = 'low';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_race_condition', severity);

    return {
        severity,
        issueType,
        check: 'slow_initialization',
        message: `Registry initialization in progress for ${timeInInit}ms (possible race)`,
        context: createStandardContext({
            guardName: 'runtime-registry-health-guard',
            metricValue: timeInInit,
            threshold: 5000,
            severity,
            suggestedAction: 'Check if initializeDefaultGuards() is being called concurrently.',
            suggestedAlternatives: [
                'Ensure initializationPromise lock is working',
                'Add timeout to initialization',
                'Review async imports for deadlocks'
            ],
            extraData: {
                registryFile: filePath,
                timeInInit,
                hasInitPromise,
                isInitialized
            }
        })
    };
}
