import {
    IssueDomains,
    StandardSuggestions,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

const SHADOW_VOLUME_HIGH = 30;
const SHADOW_VOLUME_MEDIUM = 20;

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

export function buildShadowVolumeMediumIssue({ shadowVolume, metadata }) {
    const severity = 'medium';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

    return {
        severity,
        issueType,
        check: 'shadow_volume',
        message: `Elevated Shadow Volume: ${shadowVolume}% of lines not indexed`,
        context: createStandardContext({
            guardName: 'pipeline-health-guard',
            metricValue: shadowVolume,
            threshold: SHADOW_VOLUME_MEDIUM,
            severity,
            suggestedAction: 'Monitor unindexed lines for important logic',
            extraData: {
                shadowVolume,
                unindexedLines: metadata.unindexedLines || []
            }
        })
    };
}

export function buildZeroAtomsIssue({ parsedLines, metadata }) {
    const severity = 'medium';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

    return {
        severity,
        issueType,
        check: 'zero_atoms',
        message: `Zero atoms extracted from ${parsedLines} lines of code`,
        context: createStandardContext({
            guardName: 'pipeline-health-guard',
            metricValue: 0,
            threshold: 1,
            severity,
            suggestedAction: 'Verify parser is working correctly for this file. Check for syntax errors or unsupported patterns.',
            suggestedAlternatives: [
                'Check for syntax errors in the file',
                'Verify file extension matches parser expectations',
                'Review if code uses unsupported modern syntax'
            ],
            extraData: {
                atomCount: 0,
                parsedLines,
                fileType: metadata.fileType || 'unknown'
            }
        })
    };
}

export function buildSlowAnalysisIssue({ analysisTime, parsedLines }) {
    const severity = 'low';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);

    return {
        severity,
        issueType,
        check: 'slow_analysis',
        message: `Slow analysis: ${analysisTime}ms for ${parsedLines} lines`,
        context: createStandardContext({
            guardName: 'pipeline-health-guard',
            metricValue: analysisTime,
            threshold: 5000,
            severity,
            suggestedAction: 'Consider breaking this file into smaller modules',
            extraData: {
                analysisTime,
                linesPerMs: parsedLines / analysisTime
            }
        })
    };
}
