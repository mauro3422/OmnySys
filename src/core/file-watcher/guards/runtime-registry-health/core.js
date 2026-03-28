import { createLogger } from '../../../utils/logger.js';
import { getOrCreateRuntimeRegistryHealthStats } from './stats.js';
import { collectRuntimeRegistryHealthIssues } from './evidence.js';
import { reportRuntimeRegistryHealth } from './reporting.js';

const logger = createLogger('OmnySys:file-watcher:guards:runtime-registry-health');

export async function detectRuntimeRegistryHealth(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        verbose = false,
        registrySnapshot = null
    } = options;

    try {
        if (!filePath.includes('registry') && !filePath.includes('Registry')) {
            return [];
        }

        const stats = getOrCreateRuntimeRegistryHealthStats(filePath);
        stats.initCalls++;

        const issues = collectRuntimeRegistryHealthIssues({
            filePath,
            registrySnapshot,
            stats
        });

        stats.lastInitTime = Date.now();

        if (issues.length > 0) {
            reportRuntimeRegistryHealth({
                filePath,
                issues,
                EventEmitterContext,
                verbose,
                logger
            });

            return issues;
        }

        return [];
    } catch (error) {
        logger.debug(`[RUNTIME-REGISTRY-HEALTH GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
