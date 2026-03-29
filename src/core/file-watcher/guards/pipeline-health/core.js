import { createLogger } from '../../../../utils/logger.js';
import { clearPersistedPipelineHealthIssues, persistPipelineHealthIssues } from './persistence.js';
import {
    buildShadowVolumeHighIssue,
    buildShadowVolumeMediumIssue,
    buildSlowAnalysisIssue,
    buildZeroAtomsIssue
} from './index.js';

const logger = createLogger('OmnySys:file-watcher:guards:pipeline-health');

const SHADOW_VOLUME_HIGH = 30;
const SHADOW_VOLUME_MEDIUM = 20;
const MIN_CODE_LINES = 50;

function collectPipelineHealthIssues(analysis) {
    const issues = [];
    const metadata = analysis.metadata || {};
    const shadowVolume = metadata.shadowVolume || 0;

    if (shadowVolume > SHADOW_VOLUME_HIGH) {
        issues.push(buildShadowVolumeHighIssue({ shadowVolume, metadata }));
    } else if (shadowVolume > SHADOW_VOLUME_MEDIUM) {
        issues.push(buildShadowVolumeMediumIssue({ shadowVolume, metadata }));
    }

    const atomCount = analysis.atomCount || 0;
    const parsedLines = analysis.parsed?.source?.length || 0;

    if (atomCount === 0 && parsedLines > MIN_CODE_LINES) {
        issues.push(buildZeroAtomsIssue({ parsedLines, metadata }));
    }

    const analysisTime = metadata.analysisTimeMs;
    if (analysisTime && analysisTime > 5000) {
        issues.push(buildSlowAnalysisIssue({ analysisTime, parsedLines }));
    }

    return issues;
}

function emitPipelineHealthSummary(EventEmitterContext, filePath, issues) {
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');
    const lowIssues = issues.filter((issue) => issue.severity === 'low');

    EventEmitterContext.emit('code:pipeline-health', {
        filePath,
        totalIssues: issues.length,
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length,
        checks: issues.map((issue) => ({
            check: issue.check,
            severity: issue.severity,
            message: issue.message
        }))
    });

    return { highIssues, mediumIssues, lowIssues };
}

export async function detectPipelineIssues(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        analysis = null,
        verbose = true
    } = options;

    try {
        if (!analysis) {
            await clearPersistedPipelineHealthIssues(rootPath, filePath);
            return [];
        }

        const issues = collectPipelineHealthIssues(analysis);

        if (issues.length > 0) {
            await persistPipelineHealthIssues(rootPath, filePath, issues);
            emitPipelineHealthSummary(EventEmitterContext, filePath, issues);

            if (verbose) {
                logger.warn(`[PIPELINE-HEALTH] ${filePath}: ${issues.length} issue(s) detected`);
            }

            return issues;
        }

        await clearPersistedPipelineHealthIssues(rootPath, filePath);
        return [];
    } catch (error) {
        logger.debug(`[PIPELINE-HEALTH GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
