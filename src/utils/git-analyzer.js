import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createLogger } from './logger.js';

const execAsync = promisify(exec);
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

    const stats = {};
    logger.info('🌳 Extracting Git metadata (age & frequency) via bulk command...');

    try {
        // Run git log globally, showing commit timestamp then modified files
        // --name-only gives just file paths. Max buffer 50MB for large repos.
        // The --root flag is CRITICAL to show files in the first commit of the repo.
        const { stdout } = await execAsync('git --no-pager log --name-only --root --format="COMMIT|%at"', {
            cwd: rootPath,
            maxBuffer: 1024 * 1024 * 50
        });

        const lines = stdout.split('\n');
        let currentTimestamp = 0;
        const nowTimestamp = Math.floor(Date.now() / 1000);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('COMMIT|')) {
                currentTimestamp = parseInt(trimmed.split('|')[1], 10);
            } else {
                const filePath = trimmed; // In git, this is usually relative to root, using forward slashes
                if (!stats[filePath]) {
                    stats[filePath] = {
                        commits: 0,
                        firstCommitTs: currentTimestamp,
                        lastCommitTs: currentTimestamp
                    };
                }
                stats[filePath].commits += 1;

                // Git log goes backward in time, so subsequent occurrences are older commits
                if (currentTimestamp < stats[filePath].firstCommitTs) {
                    stats[filePath].firstCommitTs = currentTimestamp;
                }
                if (currentTimestamp > stats[filePath].lastCommitTs) {
                    stats[filePath].lastCommitTs = currentTimestamp;
                }
            }
        }

        // Calculate final metrics for DB tracking
        for (const [file, data] of Object.entries(stats)) {
            // Age in days = (now - first commit) / 86400
            data.ageDays = Math.max(0, Math.floor((nowTimestamp - data.firstCommitTs) / 86400));
            // Frequency = changes per day (overall) rounded to 4 decimals max to avoid console noise
            data.changeFrequency = Number((data.commits / Math.max(1, data.ageDays)).toFixed(4));
        }

        gitStatsCache = stats;
        logger.info(`  ✓ Git metadata extracted for ${Object.keys(stats).length} files.`);
    } catch (error) {
        logger.warn(`  ⚠️ Failed to extract git stats (Not a git repo or no commits yet?): ${error.message}`);
        gitStatsCache = {}; // empty fallback to prevent future attempts failing
    }

    return gitStatsCache;
}
