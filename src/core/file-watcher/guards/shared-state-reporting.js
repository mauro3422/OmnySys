import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import { persistSharedStateContentionIssue } from './shared-state-persistence.js';

export async function reportSharedStateContentionIssue(rootPath, filePath, evidence, EventEmitterContext, verbose, logger) {
    const { issueType, severity, message, context, maxContention, totalContention, hotAtom } = evidence;

    if (verbose) {
        logger.warn(`[SHARED STATE][${severity.toUpperCase()}] ${filePath}: maxContention=${maxContention}, hotAtom=${hotAtom?.name}`);
    }

    EventEmitterContext.emit('shared-state:contention', {
        filePath,
        severity,
        message,
        maxContention,
        hotAtom: hotAtom?.name,
        totalContention
    });

    await persistSharedStateContentionIssue(
        rootPath,
        filePath,
        issueType,
        severity,
        message,
        context
    );

    if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
    if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
    if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');

    return { severity, maxContention, totalContention, context };
}
