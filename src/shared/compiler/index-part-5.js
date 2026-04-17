export {
  WATCHER_LIFECYCLE_FILTER,
  normalizeWatcherAlertLifecycleFilter,
  matchesWatcherAlertLifecycle,
  getWatcherIssueFamily,
  getWatcherIssueIdentity,
  findSupersededWatcherAlertIds,
  partitionWatcherAlertsByLifecycle,
  filterWatcherAlertsByLifecycle
} from './watcher-issue-reconciliation.js';

export {
  normalizeWatcherIssueFilePath,
  findOrphanedWatcherAlertIds,
  findOutdatedWatcherAlertIds
} from './watcher-issue-storage.js';

export {
  ALERT_THRESHOLDS,
  calculateToolTrend,
  generateAutomaticAlerts,
  getDailyToolMetrics,
  formatToolHealthDashboard
} from './tool-health-trending.js';

export {
  CANONICAL_SURFACE_REGISTRY
} from './canonical-surface-registry.js';

export function buildFolderizationMoveSnapshot(focusPlan) {
  return {
    createdAt: new Date().toISOString(),
    candidate: {
      familyRoot: focusPlan?.candidate?.familyRoot || null,
      recommendedFolder: focusPlan?.candidate?.recommendedFolder || null,
      barrelFile: focusPlan?.candidate?.barrelFile || null
    },
    impactedFiles: focusPlan?.moveTargets?.map(t => t.to) || [],
    dependentsBySourcePath: new Map()
  };
}

