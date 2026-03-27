import {
    IssueDomains,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

const SHADOW_VOLUME_HIGH = 30;

export function buildShadowVolumeHighIssue({ shadowVolume, metadata }) {
    const severity = 'high';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

    return {
        severity,
        issueType,
        check: 'shadow_volume',
        message: `High Shadow Volume: ${shadowVolume}% of lines are not indexed`,
        context: createStandardContext({
            guardName: 'pipeline-health-guard',
            metricValue: shadowVolume,
            threshold: SHADOW_VOLUME_HIGH,
            severity,
            suggestedAction: 'Review parser configuration for this file type. Unindexed code may contain untracked logic.',
            suggestedAlternatives: [
                'Check if the file uses unsupported syntax',
                'Verify parser plugin is enabled for this language',
                'Consider adding custom extractor if needed'
            ],
            extraData: {
                shadowVolume,
                unindexedLines: metadata.unindexedLines || [],
                totalLines: metadata.totalLines,
                indexedLines: metadata.indexedLines
            }
        })
    };
}
