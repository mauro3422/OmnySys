import { clearWatcherIssue, persistWatcherIssue } from '../watcher-issue-persistence.js';

export async function clearPersistedSharedStateContentionIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
    await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
    await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');
}

export async function persistSharedStateContentionIssue(rootPath, filePath, issueType, severity, message, context) {
    await persistWatcherIssue(rootPath, filePath, issueType, severity, message, context);
}
