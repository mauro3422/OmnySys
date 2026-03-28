import { getRepositoryMutationJournalSnapshot, getRepositoryStatus } from './repository-bridge.js';

export function getRepositoryDiagnostics(projectPath) {
  const status = getRepositoryStatus(projectPath);
  const journalSnapshot = getRepositoryMutationJournalSnapshot(projectPath);
  const queuedDurable = journalSnapshot.entries.filter((entry) => entry.durability === 'durable').length;
  const issues = [];
  const recommendations = [];

  if (!status.initialized) {
    issues.push('repository_not_initialized');
    recommendations.push('Initialize the repository before running durable mutations.');
  }

  if (!status.dbOpen) {
    issues.push('database_closed');
    recommendations.push('Reopen or reinitialize SQLite, then flush the repository mutation journal.');
  }

  if (journalSnapshot.queued > 0) {
    issues.push('queued_mutations_pending');
    recommendations.push('Flush the repository mutation journal after SQLite is ready.');
  }

  if (status.ready && journalSnapshot.queued === 0) {
    recommendations.push('Repository is healthy and ready for immediate writes.');
  }

  const health = !status.ready
    ? 'degraded'
    : journalSnapshot.queued > 0
      ? 'degraded'
      : 'healthy';

  return {
    health,
    status,
    journal: journalSnapshot,
    queuedDurable,
    issues,
    recommendations
  };
}
