/**
 * @fileoverview File Watcher
 * 
 * Monitors file system changes for hot-reload functionality.
 * Uses Node.js fs.watch API with debouncing support.
 * 
 * @module hot-reload-manager/watchers/file-watcher
 */

import { watch } from 'fs';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload:watcher');

/**
 * File system watcher for hot-reload
 * 
 * @class FileWatcher
 */
export class FileWatcher {
  /**
   * Creates a file watcher instance
   * @param {Object} options - Configuration options
   * @param {string} options.projectPath - Path to watch
   * @param {Function} options.onChange - Callback for file changes
   * @param {number} [options.debounceMs=500] - Debounce timeout
   */
  constructor(options) {
    this.projectPath = options.projectPath;
    this.onChange = options.onChange;
    this.debounceMs = options.debounceMs || 500;
    this.fsWatcher = null;
    this._debounceTimeout = null;
    this._startedAt = 0;
    this._startupNoiseSuppressed = 0;
    // CRITICAL: Post-restart warmup period to ignore ALL events from files
    // that were modified before/during the restart. Prevents false restarts
    // when fs.watch emits stale events on Windows.
    this._warmupPeriodMs = Number(process.env.OMNYSYS_WATCHER_WARMUP_MS || 30000);
  }

  /**
   * Starts watching for file changes
   * @returns {Promise<void>}
   */
  async start() {
    if (this.fsWatcher) {
      logger.warn('File watcher already started');
      return;
    }

    try {
      const srcPath = path.resolve(this.projectPath, 'src');
      this._startedAt = Date.now();

      this.fsWatcher = watch(
        srcPath,
        { recursive: true },
        (eventType, filename) => this._handleChange(eventType, filename)
      );

      this.fsWatcher.on('error', (error) => {
        logger.error('File watcher error:', error);
      });

      logger.info(`File watcher started: ${srcPath}`);
    } catch (error) {
      logger.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  /**
   * Stops watching for file changes
   */
  stop() {
    this._clearDebounce();

    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
      logger.info('File watcher stopped');
    }
  }

  /**
   * Handles file change events with debouncing
   * @private
   * @param {string} eventType - Type of change
   * @param {string} filename - Changed file path (relative to src/)
   */
  async _handleChange(eventType, filename) {
    if (!filename || !filename.endsWith('.js')) {
      return;
    }

    const timeSinceStart = Date.now() - this._startedAt;

    // Phase 1: Ignore startup noise (Windows fs.watch bootstrap churn)
    if (timeSinceStart < 1500) {
      this._startupNoiseSuppressed += 1;
      logger.debug(`Ignoring startup watcher noise: ${filename}`);
      return;
    }

    // Phase 2: CRITICAL - Post-restart warmup period
    // After a processRestart, the file watcher may receive stale events from
    // files that were modified during the restart sequence. We ignore ALL
    // events during the warmup period to prevent false restarts.
    if (timeSinceStart < this._warmupPeriodMs) {
      const remaining = Math.round((this._warmupPeriodMs - timeSinceStart) / 1000);
      logger.debug(`Ignoring post-restart warmup event: ${filename} (${remaining}s remaining in warmup)`);
      return;
    }

    // Phase 3: Normal operation - verify file was actually modified after watcher started
    // This catches edge cases where warmup period wasn't enough
    try {
      const fullPath = path.resolve(this.projectPath, 'src', filename);
      const fs = await import('fs/promises');
      const stats = await fs.stat(fullPath);
      const fileModifiedAt = stats.mtimeMs;
      
      // If file was modified before watcher started (+2s grace), ignore it
      if (fileModifiedAt < this._startedAt - 2000) {
        const ageMs = this._startedAt - fileModifiedAt;
        logger.debug(`Ignoring pre-restart file change: ${filename} (modified ${Math.round(ageMs / 1000)}s before watcher)`);
        return;
      }
    } catch (error) {
      // If we can't stat the file, assume it's valid (might have been deleted)
      logger.debug(`Could not stat file ${filename}: ${error.message}`);
    }

    // If we reach here, this is a legitimate post-warmup file change
    logger.info(`📝 File change detected: ${filename} (${timeSinceStart}ms after watcher start)`);

    this._clearDebounce();

    this._debounceTimeout = setTimeout(() => {
      const fullPath = path.normalize(path.join('src', filename)).replace(/\\/g, '/');
      this.onChange(eventType, fullPath);
    }, this.debounceMs);

    if (this._debounceTimeout.unref) {
      this._debounceTimeout.unref();
    }
  }

  /**
   * Clears pending debounce timeout
   * @private
   */
  _clearDebounce() {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
      this._debounceTimeout = null;
    }
  }

  /**
   * Checks if watcher is active
   * @returns {boolean}
   */
  isWatching() {
    return !!this.fsWatcher;
  }

  getFileWatcherStats() {
    return {
      startupNoiseSuppressed: this._startupNoiseSuppressed,
      startupSuppressionWindowMs: 1500,
      isWatching: this.isWatching()
    };
  }
}

export default FileWatcher;
