import { createLogger } from '../../../utils/logger.js';
import { StandardThresholds } from './guard-standards.js';
import { collectEventLeakIssues } from './event-leak-collection.js';
import { reportEventLeakIssues } from './event-leak-reporting.js';
import { clearPersistedEventLeakIssues } from './event-leak-persistence.js';

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

        const issues = collectEventLeakIssues(atoms, listenerThreshold);

        if (issues.length > 0) {
            await reportEventLeakIssues({
                rootPath,
                filePath,
                issues,
                EventEmitterContext,
                verbose,
                logger
            });
        } else {
            await clearPersistedEventLeakIssues(rootPath, filePath);
        }

        return issues;
    } catch (error) {
        logger.debug(`[EVENT-LEAK GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
