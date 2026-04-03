import { runAsyncBoundary } from '../../../../shared/compiler/index.js';
import { clearWatcherIssue, persistWatcherIssue } from '../../watcher-issue-persistence.js';

export async function clearPersistedSharedStateContentionIssues(rootPath, filePath) {
    return await runAsyncBoundary('clearPersistedSharedStateContentionIssues', async () => {
        await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
        await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
        await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');
    });
}

export async function persistSharedStateContentionIssue(rootPath, filePath, issueType, severity, message, context) {
    return await runAsyncBoundary('persistSharedStateContentionIssue', async () => {
        await persistWatcherIssue(rootPath, filePath, issueType, severity, message, context);
    });
}
