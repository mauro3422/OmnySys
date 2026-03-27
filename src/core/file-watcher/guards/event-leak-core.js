import { createLogger } from '../../../utils/logger.js';
import {
    extractAtomMetrics,
    isValidGuardTarget,
    StandardThresholds
} from './guard-standards.js';
import { analyzeEventListeners } from './event-leak-analysis.js';
import {
    buildEventLeakIssue,
    buildEventLeakMetadataIssue
} from './event-leak-issues.js';
import {
    clearPersistedEventLeakIssues,
    persistEventLeakIssues
} from './event-leak-persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:event-leak');

export async function detectEventLeaks(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        listenerThreshold = StandardThresholds.LISTENERS_PER_EMITTER,
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearPersistedEventLeakIssues(rootPath, filePath);
            return [];
        }

        const issues = [];

        for (const atom of atoms) {
            if (!isValidGuardTarget(atom)) continue;

            const metrics = extractAtomMetrics(atom);
            const code = atom.sourceCode || atom.code || '';

            const listenerAnalysis = analyzeEventListeners(code);

            if (listenerAnalysis.hasLeakRisk) {
                issues.push(buildEventLeakIssue({
                    metrics,
                    listenerAnalysis,
                    listenerThreshold
                }));
            }

            if (metrics.eventListeners && metrics.eventListeners.length > 0) {
                const hasMatchingEmitters = metrics.eventEmitters && metrics.eventEmitters.length > 0;

                if (!hasMatchingEmitters && metrics.eventListeners.length >= listenerThreshold) {
                    const alreadyReported = issues.some((issue) => issue.atomId === metrics.id);

                    if (!alreadyReported) {
                        issues.push(buildEventLeakMetadataIssue({
                            metrics,
                            listenerThreshold
                        }));
                    }
                }
            }
        }

        if (issues.length > 0) {
            await persistEventLeakIssues(rootPath, filePath, issues);

            EventEmitterContext.emit('runtime:event-leak', {
                filePath,
                totalIssues: issues.length,
                high: issues.filter((issue) => issue.severity === 'high').length,
                medium: issues.filter((issue) => issue.severity === 'medium').length,
                low: issues.filter((issue) => issue.severity === 'low').length,
                issues: issues.map((issue) => ({
                    atomName: issue.atomName,
                    severity: issue.severity,
                    listenerCount: issue.context.extraData?.listenerCount
                }))
            });

            if (verbose) {
                logger.warn(`[EVENT-LEAK] ${filePath}: ${issues.length} potential leak(s) detected`);
            }
        } else {
            await clearPersistedEventLeakIssues(rootPath, filePath);
        }

        return issues;
    } catch (error) {
        logger.debug(`[EVENT-LEAK GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
