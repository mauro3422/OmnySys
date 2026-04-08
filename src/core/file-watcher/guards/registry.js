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
import { registerRegistryStatsProvider } from './registry/stats.js';
import {
  createGuardRegistryStats,
  registerImpactGuard,
  registerSemanticGuard,
  getGuardMetadata,
  listGuards,
  runGuardGroup,
  initializeDefaultGuards
} from './registry/operations.js';

class GuardRegistry {
  constructor() {
    this.semanticGuards = new Map();
    this.impactGuards = new Map();
    this.metadata = new Map();
    this.initialized = false;
    this.initializationPromise = null;
    this.logger = createLogger('OmnySys:guards:registry');

    registerRegistryStatsProvider(this);
  }

  getGuardRegistryStats() {
    return createGuardRegistryStats(this);
  }

  registerSemanticGuard(name, guardFn, metadata = {}) {
    return registerSemanticGuard(this, name, guardFn, metadata);
  }

  registerImpactGuard(name, guardFn, metadata = {}) {
    return registerImpactGuard(this, name, guardFn, metadata);
  }

  getGuardMetadata(name) {
    return getGuardMetadata(this, name);
  }

  listGuards() {
    return listGuards(this);
  }

  async runSemanticGuards(rootPath, filePath, context, atoms, options = {}) {
    await this.initializeDefaultGuards();
    return runGuardGroup(
      this,
      this.semanticGuards,
      'semantic',
      rootPath,
      filePath,
      async (guardFn) => guardFn(rootPath, filePath, context, atoms, options)
    );
  }

  async runImpactGuards(rootPath, filePath, context, options = {}) {
    await this.initializeDefaultGuards();
    return runGuardGroup(
      this,
      this.impactGuards,
      'impact',
      rootPath,
      filePath,
      async (guardFn) => guardFn(rootPath, filePath, context, options)
    );
  }

  async initializeDefaultGuards() {
    return initializeDefaultGuards(this);
  }
}

const GUARD_REGISTRY_GLOBAL_KEY = Symbol.for('omnysys.fileWatcher.guardRegistry');
const globalGuardRegistryState = globalThis[GUARD_REGISTRY_GLOBAL_KEY] || (globalThis[GUARD_REGISTRY_GLOBAL_KEY] = {});

export const guardRegistry = globalGuardRegistryState.instance || (globalGuardRegistryState.instance = new GuardRegistry());
