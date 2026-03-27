import { IssueDomains, createIssueType, createStandardContext } from './guard-standards.js';

export function buildDuplicateRegistrationIssue({ filePath, duplicates }) {
    const severity = 'high';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_idempotency', severity);

    return {
        severity,
        issueType,
        check: 'duplicate_registration',
        message: `Registry has ${duplicates.length} duplicate registrations by name`,
        context: createStandardContext({
            guardName: 'runtime-registry-health-guard',
            metricValue: duplicates.length,
            threshold: 0,
            severity,
            suggestedAction: 'Make registry registration idempotent by name. Check register*Guard methods.',
            suggestedAlternatives: [
                'Add has() check before registration',
                'Use debug log instead of warn for duplicates',
                'Implement initialization lock to prevent race conditions'
            ],
            extraData: {
                duplicates: duplicates.slice(0, 5),
                totalDuplicates: duplicates.length,
                registryFile: filePath
            }
        })
    };
}

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

export function buildRegistryLeakIssue({ filePath, semanticCount, impactCount, totalSize }) {
    const severity = 'medium';
    const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_leak', severity);

    return {
        severity,
        issueType,
        check: 'registry_growth',
        message: `Registry has grown to ${totalSize} guards (possible leak)`,
        context: createStandardContext({
            guardName: 'runtime-registry-health-guard',
            metricValue: totalSize,
            threshold: 50,
            severity,
            suggestedAction: 'Review if guards are being properly cleaned up. Consider implementing unregister methods.',
            suggestedAlternatives: [
                'Add cleanup on module unload',
                'Implement registry size limits',
                'Periodically compact registry'
            ],
            extraData: {
                registryFile: filePath,
                totalSize,
                semanticGuards: semanticCount,
                impactGuards: impactCount
            }
        })
    };
}

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
