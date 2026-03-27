import { extractAtomMetrics, isValidGuardTarget } from './guard-standards.js';
import { analyzeEventListeners } from './event-leak-analysis.js';
import {
    buildEventLeakIssue,
    buildEventLeakMetadataIssue
} from './event-leak-issues.js';

export function collectEventLeakIssues(atoms = [], listenerThreshold) {
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

    return issues;
}
