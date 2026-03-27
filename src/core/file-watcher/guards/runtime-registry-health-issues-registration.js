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
