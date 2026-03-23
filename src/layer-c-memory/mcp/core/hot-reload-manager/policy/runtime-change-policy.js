/**
 * @fileoverview Runtime Change Policy
 *
 * Central policy for classifying runtime file changes into operational
 * actions. The goal is to keep the daemon alive while distinguishing between
 * reloadable modules, reindex-worthy modules, and restart-required modules.
 */

const IGNORED_PATTERNS = [
  /(^|[\\/])docs([\\/]|$)/i,
  /(^|[\\/])tests?([\\/]|$)/i,
  /(^|[\\/])changelogs?([\\/]|$)/i,
  /(^|[\\/])\.vscode([\\/]|$)/i,
  /(^|[\\/])archive([\\/]|$)/i,
  /(^|[\\/])backlog([\\/]|$)/i
];

const REINDEX_PATTERNS = [
  /(^|[\\/])layer-a-static[\\/](analyses|pipeline|extractors)[\\/].*\.js$/i,
  /(^|[\\/])shared[\\/]compiler[\\/].*\.js$/i,
  /(^|[\\/])core[\\/]file-watcher[\\/].*\.js$/i,
  /(^|[\\/])layer-c-memory[\\/]storage[\\/].*\.js$/i
];

const RESTART_PATTERNS = [
  /(^|[\\/])layer-c-memory[\\/]mcp[\\/].*\.js$/i,
  /(^|[\\/])layer-c-memory[\\/]mcp-http-(proxy|server)\.js$/i,
  /(^|[\\/])core[\\/]unified-server[\\/].*\.js$/i,
  /(^|[\\/])core[\\/]orchestrator[\\/].*\.js$/i,
  /(^|[\\/])cli[\\/].*\.js$/i
];

function isIgnoredSurface(normalized) {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isCriticalSurface(moduleInfo) {
  return moduleInfo?.type === 'critical';
}

function isRefreshSurface(normalized) {
  return (
    /(^|[\\/])shared[\\/]atomic-cache\.js$/i.test(normalized) ||
    /(^|[\\/])shared[\\/]derivation-engine[\\/].*\.js$/i.test(normalized) ||
    /(^|[\\/])layer-c-memory[\\/]storage[\\/]database[\\/]connection\.js$/i.test(normalized)
  );
}

function isRuntimeRestartSurface(normalized) {
  return RESTART_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isReindexSurface(normalized) {
  return (
    /(^|[\\/])shared[\\/](compiler)[\\/].*\.js$/i.test(normalized) ||
    /(^|[\\/])layer-c-memory[\\/]storage[\\/]repository[\\/].*\.js$/i.test(normalized) ||
    /(^|[\\/])layer-c-memory[\\/]storage[\\/]adapters[\\/].*\.js$/i.test(normalized) ||
    /(^|[\\/])layer-c-memory[\\/]storage[\\/]repository[\\/]adapters[\\/].*\.js$/i.test(normalized) ||
    REINDEX_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

export const RuntimeChangeAction = Object.freeze({
  IGNORE: 'ignore',
  REFRESH: 'refresh',
  RELOAD: 'reload',
  REINDEX: 'reindex',
  RESTART: 'restart'
});

export function classifyRuntimeChange(filename = '', moduleInfo = null) {
  const normalized = String(filename || '').replace(/\\/g, '/');

  if (isIgnoredSurface(normalized)) {
    return {
      action: RuntimeChangeAction.IGNORE,
      reason: 'non-runtime surface',
      restartRequired: false,
      reloadRequired: false,
      reindexRequired: false
    };
  }

  if (isCriticalSurface(moduleInfo)) {
    return {
      action: RuntimeChangeAction.RESTART,
      reason: 'critical runtime surface',
      restartRequired: true,
      reloadRequired: false,
      reindexRequired: false
    };
  }

  if (isRefreshSurface(normalized)) {
    return {
      action: RuntimeChangeAction.REFRESH,
      reason: 'cache or metadata surface',
      restartRequired: false,
      reloadRequired: false,
      reindexRequired: false,
      refreshRequired: true
    };
  }

  if (isRuntimeRestartSurface(normalized)) {
    return {
      action: RuntimeChangeAction.RESTART,
      reason: 'runtime-facing surface',
      restartRequired: true,
      reloadRequired: false,
      reindexRequired: false
    };
  }

  if (isReindexSurface(normalized)) {
    return {
      action: RuntimeChangeAction.REINDEX,
      reason: 'analysis or storage surface',
      restartRequired: false,
      reloadRequired: false,
      reindexRequired: true,
      refreshRequired: false
    };
  }

  if (moduleInfo) {
    return {
      action: RuntimeChangeAction.RELOAD,
      reason: moduleInfo.type || 'reloadable surface',
      restartRequired: false,
      reloadRequired: true,
      reindexRequired: false,
      refreshRequired: false
    };
  }

  return {
    action: RuntimeChangeAction.IGNORE,
    reason: 'non-reloadable surface',
    restartRequired: false,
    reloadRequired: false,
    reindexRequired: false,
    refreshRequired: false
  };
}
