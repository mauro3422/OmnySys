/**
 * @fileoverview State Handler
 * 
 * Preserves and restores server state during hot-reload.
 * Handles cache, orchestrator queue, and file watcher state.
 * 
 * @module hot-reload-manager/handlers/state-handler
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload:state');

/**
 * Handles state preservation during hot-reload
 * 
 * @class StateHandler
 */
export class StateHandler {
  constructor(server) {
    this.server = server;
    this.preservedState = null;
  }

  /**
   * Preserves current server state
   */
  preserve() {
    logger.debug('Preserving server state...');

    this.preservedState = {
      cache: this._preserveCache(),
      orchestrator: this._preserveOrchestrator(),
      fileWatcher: this._preserveFileWatcher(),
      timestamp: Date.now()
    };

    logger.debug('State preserved');
  }

  /**
   * Restores previously preserved state
   */
  restore() {
    if (!this.preservedState) {
      logger.warn('No state to restore');
      return;
    }

    logger.debug('Restoring server state...');

    this._restoreCache();
    this._restoreOrchestrator();
    this._restoreFileWatcher();

    logger.debug('State restored');
    this.preservedState = null;
  }

  /**
   * Clears preserved state
   */
  clear() {
    this.preservedState = null;
  }

  /**
   * Preserves cache state
   * @private
   * @returns {Object|null}
   */
  _preserveCache() {
    if (!this.server.cache) return null;

    return {
      fileIndex: new Map(this.server.cache.fileIndex),
      analysisCache: new Map(this.server.cache.analysisCache)
    };
  }

  /**
   * Preserves orchestrator state
   * @private
   * @returns {Object|null}
   */
  _preserveOrchestrator() {
    if (!this.server.orchestrator) return null;

    return {
      queue: this.server.orchestrator.queue?.items
        ? [...this.server.orchestrator.queue.items]
        : [],
      isIndexing: this.server.orchestrator.isIndexing,
      indexedFiles: new Set(this.server.orchestrator.indexedFiles || []),
      stats: { ...this.server.orchestrator.stats }
    };
  }

  /**
   * Preserves file watcher state
   * @private
   * @returns {Object|null}
   */
  _preserveFileWatcher() {
    if (!this.server.orchestrator?.fileWatcher) return null;

    return {
      fileHashes: new Map(this.server.orchestrator.fileWatcher.fileHashes),
      pendingChanges: new Map(this.server.orchestrator.fileWatcher.pendingChanges)
    };
  }

  /**
   * Restores cache state
   * @private
   */
  _restoreCache() {
    if (!this.preservedState.cache || !this.server.cache) return;

    this.server.cache.fileIndex = this.preservedState.cache.fileIndex;
    this.server.cache.analysisCache = this.preservedState.cache.analysisCache;
  }

  /**
   * Restores orchestrator state
   * @private
   */
  _restoreOrchestrator() {
    if (!this.preservedState.orchestrator || !this.server.orchestrator) return;

    if (!this.server.orchestrator.queue) {
      this.server.orchestrator.queue = { items: [] };
    }

    this.server.orchestrator.queue.items = this.preservedState.orchestrator.queue || [];
    this.server.orchestrator.isIndexing = this.preservedState.orchestrator.isIndexing;
    this.server.orchestrator.indexedFiles = this.preservedState.orchestrator.indexedFiles;
    this.server.orchestrator.stats = this.preservedState.orchestrator.stats;
  }

  /**
   * Restores file watcher state
   * @private
   */
  _restoreFileWatcher() {
    if (!this.preservedState.fileWatcher || !this.server.orchestrator?.fileWatcher) return;

    this.server.orchestrator.fileWatcher.fileHashes = 
      this.preservedState.fileWatcher.fileHashes;
    this.server.orchestrator.fileWatcher.pendingChanges = 
      this.preservedState.fileWatcher.pendingChanges;
  }

  /**
   * Gets current preserved state
   * @returns {Object|null}
   */
  getPreservedState() {
    return this.preservedState;
  }

  /**
   * Checks if state is preserved
   * @returns {boolean}
   */
  hasPreservedState() {
    return !!this.preservedState;
  }
}

export default StateHandler;
