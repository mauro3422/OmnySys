import { createLogger } from '../../../../utils/logger.js';
import { shouldSkipAsyncSafetyFile } from './index.js';
import { collectAsyncSafetyIssues } from '../async-safety-collection.js';
import { reportAsyncSafetyIssues } from './reporting.js';
import { clearPersistedAsyncSafetyIssues } from './persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:async-safety');

export async function detectAsyncSafetyIssues(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        maxAsyncLines = 80,
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

        const { issues, networkIssues } = collectAsyncSafetyIssues(atoms, maxAsyncLines);

        if (issues.length > 0) {
            await reportAsyncSafetyIssues({
                rootPath,
                filePath,
                issues,
                networkIssues,
                EventEmitterContext,
                verbose,
                logger
            });
        }

        return issues;
    } catch (error) {
        logger.debug(`[ASYNC-SAFETY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
