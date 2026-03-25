/**
 * @fileoverview registry.js
 *
 * Centralized guard registry for the FileWatcher.
 * Keeps guard validation isolated from the main analysis pipeline.
 *
 * @version 2.0.0 - Standardized with guard-standards.js
 * @module core/file-watcher/guards/registry
 */

import { createLogger } from '../../../utils/logger.js';
import { validateGuard } from './guard-standards.js';
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { buildRegistryStats, registerRegistryStatsProvider } from './registry/stats.js';
import { registerGuard } from './registry/registration.js';
import { runGuardMap } from './registry/execution.js';
import { initializeDefaultGuards } from './registry/initialization.js';

const logger = createLogger('OmnySys:guards:registry');

class GuardRegistry {
  constructor() {
    this.semanticGuards = new Map();
    this.impactGuards = new Map();
    this.metadata = new Map();
    this.initialized = false;
    this.initializationPromise = null;

    registerRegistryStatsProvider(this);
  }

  getGuardRegistryStats() {
    return {
      ...buildRegistryStats(this.semanticGuards, this.impactGuards, this.metadata),
      initialized: this.initialized
    };
  }

  #registerGuard(guardMap, type, name, guardFn, metadata = {}) {
    return registerGuard(guardMap, this.metadata, validateGuard, logger, type, name, guardFn, metadata);
  }

  async #runGuardMap(guardMap, type, rootPath, filePath, runner) {
    return runGuardMap({
      guardMap,
      type,
      rootPath,
      filePath,
      runner,
      logger,
      persistWatcherIssue,
      clearWatcherIssue
    });
  }

  registerSemanticGuard(name, guardFn, metadata = {}) {
    return this.#registerGuard(this.semanticGuards, 'semantic', name, guardFn, metadata);
  }

  registerImpactGuard(name, guardFn, metadata = {}) {
    return this.#registerGuard(this.impactGuards, 'impact', name, guardFn, metadata);
  }

  getGuardMetadata(name) {
    return this.metadata.get(name) || null;
  }

  listGuards() {
    return [...this.metadata.values()];
  }

  async runSemanticGuards(rootPath, filePath, context, atoms, options = {}) {
    return this.#runGuardMap(this.semanticGuards, 'semantic', rootPath, filePath, async (guardFn) => {
      return await guardFn(rootPath, filePath, context, atoms, options);
    });
  }

  async runImpactGuards(rootPath, filePath, context, options = {}) {
    return this.#runGuardMap(this.impactGuards, 'impact', rootPath, filePath, async (guardFn) => {
      return await guardFn(rootPath, filePath, context, options);
    });
  }

  async initializeDefaultGuards() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    const { registerAllDefaultSemanticGuards, registerAllDefaultImpactGuards } = await import('./default-guards.js');
    this.initializationPromise = initializeDefaultGuards({
      semanticGuards: this.semanticGuards,
      impactGuards: this.impactGuards,
      logger,
      registerAllDefaultSemanticGuards,
      registerAllDefaultImpactGuards,
      registry: this
    });

    try {
      await this.initializationPromise;
      this.initialized = true;
    } finally {
      this.initializationPromise = null;
    }
  }
}

export const guardRegistry = new GuardRegistry();
