import {
    IssueDomains,
    createIssueType,
    createStandardContext
} from '../guard-standards.js';
import {
    buildPropagationPlan,
    buildPipelineHealthPropagationPlan,
    summarizePropagationPlan
} from '../../../../shared/compiler/index.js';

const SHADOW_VOLUME_MEDIUM = 20;

function buildPipelineHealthPropagation({
    severity,
    scopePath = null,
    focusPath = null,
    warningCount = 1,
    impactedFileCount = 1,
    rewriteCount = 0,
    topCandidates = [],
    topImpactedFiles = [],
    guidance,
    reason
}) {
    return summarizePropagationPlan(buildPipelineHealthPropagationPlan({
        scopePath,
        focusPath,
        severity,
        warningCount,
        impactedFileCount,
        rewriteCount,
        topCandidates,
        topImpactedFiles,
        guidance,
        recommendationStrategy: 'pipeline_health',
        drift: {
            state: warningCount > 0 ? 'watch' : 'stable',
            reason: reason || 'pipeline health evidence'
        }
    }));
}

export function buildShadowVolumeMediumIssue({ shadowVolume, metadata = {} }) {
    const severity = 'medium';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);
    const propagation = buildPipelineHealthPropagation({
        severity,
        scopePath: metadata.filePath || null,
        focusPath: metadata.filePath || null,
        warningCount: 1,
        impactedFileCount: 1,
        topImpactedFiles: metadata.filePath ? [{ filePath: metadata.filePath }] : [],
        guidance: 'Surface shadow-volume propagation to watcher persistence, debt reporting, and health snapshots before trusting the indexed graph.',
        reason: `shadow volume ${shadowVolume}%`
    });

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
                unindexedLines: metadata.unindexedLines || [],
                propagation
            }
        })
    };
}

export function buildZeroAtomsIssue({ parsedLines, metadata = {} }) {
    const severity = 'medium';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);
    const propagation = buildPipelineHealthPropagation({
        severity,
        scopePath: metadata.filePath || null,
        focusPath: metadata.filePath || null,
        warningCount: 1,
        impactedFileCount: 1,
        topImpactedFiles: metadata.filePath ? [{ filePath: metadata.filePath }] : [],
        guidance: 'Surface zero-atom propagation to watcher persistence, debt reporting, and health snapshots before trusting parser output.',
        reason: 'zero atoms extracted'
    });

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
                fileType: metadata.fileType || 'unknown',
                propagation
            }
        })
    };
}

export function buildSlowAnalysisIssue({ analysisTime, parsedLines, metadata = {} }) {
    const severity = 'low';
    const issueType = createIssueType(IssueDomains.CODE, 'pipeline_health', severity);
    const propagation = buildPipelineHealthPropagation({
        severity,
        scopePath: metadata.filePath || null,
        focusPath: metadata.filePath || null,
        warningCount: 1,
        impactedFileCount: 1,
        rewriteCount: 0,
        guidance: 'Surface slow-analysis propagation to cache policy and health snapshots before re-running expensive parsing paths.',
        reason: 'slow analysis evidence'
    });

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
                linesPerMs: parsedLines / analysisTime,
                propagation
            }
        })
    };
}
