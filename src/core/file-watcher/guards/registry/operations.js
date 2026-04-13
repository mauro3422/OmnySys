import { validateGuard } from '../guard-standards.js';
import { persistWatcherIssue, clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { buildRegistryStats } from './stats.js';
import { registerGuard } from './registration.js';
import { runGuardMap } from './execution.js';
import { initializeDefaultGuards as initializeDefaultGuardsImpl } from './initialization.js';

const GUARD_INIT_STATE_KEY = Symbol.for('omnysys.fileWatcher.defaultGuardsInitState');

function getGlobalGuardInitState() {
  const existing = globalThis[GUARD_INIT_STATE_KEY];
  if (existing) {
    return existing;
  }

  const state = {
    initialized: false,
    initializationPromise: null
  };
  globalThis[GUARD_INIT_STATE_KEY] = state;
  return state;
}

export function createGuardRegistryStats(registry) {
  return {
    ...buildRegistryStats(registry.semanticGuards, registry.impactGuards, registry.metadata),
    initialized: registry.initialized
  };
}

export function registerSemanticGuard(registry, name, guardFn, metadata = {}) {
  return registerGuard(registry.semanticGuards, registry.metadata, validateGuard, registry.logger, 'semantic', name, guardFn, metadata);
}

export function registerImpactGuard(registry, name, guardFn, metadata = {}) {
  return registerGuard(registry.impactGuards, registry.metadata, validateGuard, registry.logger, 'impact', name, guardFn, metadata);
}

export function getGuardMetadata(registry, name) {
  return registry.metadata.get(name) || null;
}

export function listGuards(registry) {
  return [...registry.metadata.values()];
}

export async function runGuardGroup(registry, guardMap, type, rootPath, filePath, runner) {
  return runGuardMap({
    guardMap,
    type,
    rootPath,
    filePath,
    runner,
    logger: registry.logger,
    persistWatcherIssue,
    clearWatcherIssue
  });
}

export async function initializeDefaultGuards(registry) {
  const globalState = getGlobalGuardInitState();

  if (registry.initialized || globalState.initialized) {
    return;
  }

  if (registry.initializationPromise || globalState.initializationPromise) {
    await (registry.initializationPromise || globalState.initializationPromise);
    return;
  }

  const initializationPromise = (async () => {
    try {
      const { registerAllDefaultSemanticGuards, registerAllDefaultImpactGuards } = await import('../default-guards.js');
      await initializeDefaultGuardsImpl({
        semanticGuards: registry.semanticGuards,
        impactGuards: registry.impactGuards,
        logger: registry.logger,
        registerAllDefaultSemanticGuards,
        registerAllDefaultImpactGuards,
        registry
      });
    } catch (error) {
      registry.logger?.warn(`Guard initialization failed, will retry on next use: ${error.message}`);
      throw error;
    }
  })();
  registry.initializationPromise = initializationPromise;
  globalState.initializationPromise = initializationPromise;

  try {
    await initializationPromise;
    registry.initialized = true;
    globalState.initialized = true;
  } finally {
    registry.initializationPromise = null;
    globalState.initializationPromise = null;
  }
}
