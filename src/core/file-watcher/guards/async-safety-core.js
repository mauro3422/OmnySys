import { createLogger } from '../../../utils/logger.js';
import { isValidGuardTarget, extractAtomMetrics } from './guard-standards.js';
import {
    MAX_ISSUES_PER_FILE,
    PRODUCTION_PURPOSES,
    shouldSkipAsyncSafetyFile,
    shouldSkipAsyncSafetyFunction,
    hasAsyncNetworkPattern,
    hasAsyncTryCatch
} from './async-safety-analysis.js';
import { buildAsyncSafetyIssue, buildAsyncSafetyMetadataIssue } from './async-safety-issues.js';
import { clearPersistedAsyncSafetyIssues, persistAsyncSafetyIssues } from './async-safety-persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:async-safety');

export async function detectAsyncSafetyIssues(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        maxAsyncLines = 80,
        maxIssues = MAX_ISSUES_PER_FILE,
        verbose = true,
        skipTestFiles = true
    } = options;

    try {
        await clearPersistedAsyncSafetyIssues(rootPath, filePath);

        if (skipTestFiles && shouldSkipAsyncSafetyFile(filePath)) {
            return [];
        }

        if (!atoms || atoms.length === 0) {
            return [];
        }

        const issues = [];
        let networkIssues = 0;

        for (const atom of atoms) {
            if (issues.length >= maxIssues) break;
            if (!isValidGuardTarget(atom)) continue;

            const purpose = atom.purpose || atom.purpose_type || '';
            if (!PRODUCTION_PURPOSES.includes(purpose)) continue;

            const metrics = extractAtomMetrics(atom);
            if (!metrics.isAsync) continue;
            if (shouldSkipAsyncSafetyFunction(metrics.name)) continue;

            const hasNetworkCalls = metrics.hasNetworkCalls || hasAsyncNetworkPattern(atom);
            const hasErrorHandling = metrics.hasErrorHandling || hasAsyncTryCatch(atom);

            if (hasNetworkCalls && !hasErrorHandling) {
                networkIssues++;
                const reason = metrics.linesOfCode > maxAsyncLines
                    ? `makes network calls and has ${metrics.linesOfCode} lines without error handling`
                    : 'makes network calls without error handling';

                issues.push(buildAsyncSafetyIssue({
                    metrics,
                    listenerThreshold: maxAsyncLines,
                    reason
                }));
            }

            if (metrics.eventListeners && metrics.eventListeners.length > 0) {
                const hasMatchingEmitters = metrics.eventEmitters && metrics.eventEmitters.length > 0;

                if (!hasMatchingEmitters && metrics.eventListeners.length >= maxAsyncLines) {
                    const alreadyReported = issues.some((issue) => issue.atomId === metrics.id);

                    if (!alreadyReported) {
                        issues.push(buildAsyncSafetyMetadataIssue({
                            metrics,
                            listenerThreshold: maxAsyncLines
                        }));
                    }
                }
            }
        }

        if (issues.length > 0) {
            await persistAsyncSafetyIssues(rootPath, filePath, issues, networkIssues);

            EventEmitterContext.emit('runtime:async-safety', {
                filePath,
                totalIssues: issues.length,
                high: issues.filter((issue) => issue.severity === 'high').length,
                networkIssues,
                sample: issues.slice(0, 3).map((issue) => issue.atomName)
            });

            if (verbose) {
                logger.warn(`[ASYNC-SAFETY] ${filePath}: ${issues.length} issue(s), showing top ${Math.min(issues.length, 3)}`);
            }
        }

        return issues;
    } catch (error) {
        logger.debug(`[ASYNC-SAFETY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
