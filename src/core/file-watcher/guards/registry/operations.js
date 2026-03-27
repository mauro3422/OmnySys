import { validateGuard } from '../guard-standards.js';
import { persistWatcherIssue, clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { buildRegistryStats } from './stats.js';
import { registerGuard } from './registration.js';
import { runGuardMap } from './execution.js';
import { initializeDefaultGuards as initializeDefaultGuardsImpl } from './initialization.js';

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
  if (registry.initialized) {
    return;
  }

  if (registry.initializationPromise) {
    await registry.initializationPromise;
    return;
  }

  const { registerAllDefaultSemanticGuards, registerAllDefaultImpactGuards } = await import('../default-guards.js');
  registry.initializationPromise = initializeDefaultGuardsImpl({
    semanticGuards: registry.semanticGuards,
    impactGuards: registry.impactGuards,
    logger: registry.logger,
    registerAllDefaultSemanticGuards,
    registerAllDefaultImpactGuards,
    registry
  });

  try {
    await registry.initializationPromise;
    registry.initialized = true;
  } finally {
    registry.initializationPromise = null;
  }
}
