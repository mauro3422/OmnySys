import { clearWatcherIssue, persistWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:guards:hotspot-persistence');

export async function clearPersistedHotspotIssues(rootPath, filePath) {
    try {
        await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
        await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
    } catch (error) {
        logger.debug(`[HOTSPOT PERSISTENCE CLEAR SKIP] ${filePath}: ${error.message}`);
    }
}

export async function persistHotspotIssues(rootPath, filePath, payload) {
    try {
        if (payload.highIssues.length > 0) {
            await persistWatcherIssue(
                rootPath,
                filePath,
                'perf_hotspot_high',
                'high',
                `[${payload.highIssues.length} HOTSPOT(s)] ${payload.highIssues[0].message}`,
                {
                    issues: payload.highIssues.map((issue) => issue.context),
                    totalChangeFrequency: payload.totalChangeFrequency
                }
            );
        } else {
            await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
        }

        if (payload.mediumIssues.length > 0) {
            await persistWatcherIssue(
                rootPath,
                filePath,
                'perf_hotspot_medium',
                'medium',
                `[${payload.mediumIssues.length} potential hotspot(s)]`,
                { issues: payload.mediumIssues.map((issue) => issue.context) }
            );
        } else {
            await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
        }
    } catch (error) {
        logger.debug(`[HOTSPOT PERSISTENCE SKIP] ${filePath}: ${error.message}`);
    }
}
