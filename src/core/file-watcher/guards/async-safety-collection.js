import { isValidGuardTarget, extractAtomMetrics } from './guard-standards.js';
import {
    MAX_ISSUES_PER_FILE,
    PRODUCTION_PURPOSES,
    shouldSkipAsyncSafetyFunction,
    hasAsyncNetworkPattern,
    hasAsyncTryCatch
} from './async-safety/index.js';
import { buildAsyncSafetyIssue, buildAsyncSafetyMetadataIssue } from './async-safety/issues.js';

export function collectAsyncSafetyIssues(atoms = [], maxAsyncLines = 80, maxIssues = MAX_ISSUES_PER_FILE) {
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

    return {
        issues,
        networkIssues
    };
}
