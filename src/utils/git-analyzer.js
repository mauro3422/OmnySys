import { GitTerminalBridge } from '../shared/utils/git-terminal-bridge.js';
import { createLogger } from './logger.js';

const logger = createLogger('OmnySys:git-analyzer');

let gitStatsCache = null;

/**
 * Executes a bulk git log to retrieve file age and change frequency.
 * Results are cached in memory for the duration of the index process.
 * 
 * @param {string} rootPath Absolute path to the git repository
 * @returns {Promise<Object>} Map of relative file paths to { ageDays, changeFrequency }
 */
export async function getGitStats(rootPath) {
    if (gitStatsCache) return gitStatsCache;

    logger.info('🌳 Extracting Git metadata via unified GitTerminalBridge...');

    try {
        const bridge = new GitTerminalBridge(rootPath, logger);
        gitStatsCache = await bridge.getBulkStats();

        logger.info(`  ✓ Git metadata extracted for ${Object.keys(gitStatsCache).length} files.`);
    } catch (error) {
        logger.warn(`  ⚠️ Failed to extract git stats: ${error.message}`);
        gitStatsCache = {};
    }

    return gitStatsCache;
}
