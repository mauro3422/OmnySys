import { IssueDomains, createIssueType, createStandardContext } from '../guard-standards.js';

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
