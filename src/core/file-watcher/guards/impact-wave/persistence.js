import { clearWatcherIssue } from '../../watcher-issue-persistence.js';

export async function clearPersistedImpactWaveIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'arch_impact_high');
    await clearWatcherIssue(rootPath, filePath, 'arch_impact_medium');
    await clearWatcherIssue(rootPath, filePath, 'arch_impact_low');
}
