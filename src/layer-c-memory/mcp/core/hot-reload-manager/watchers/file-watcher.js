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
import { processFileWatcherChange } from './file-watcher-helpers.js';

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
    this._lastChangeEvents = new Map();
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
      this._lastChangeEvents.clear();
      const srcPath = path.resolve(this.projectPath, 'src');
      this._startedAt = Date.now();

      this.fsWatcher = watch(srcPath, { recursive: true }, (eventType, filename) => {
        this._handleChange(eventType, filename);
      });

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
    this._lastChangeEvents.clear();

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
    return processFileWatcherChange({
      eventType,
      filename,
      projectPath: this.projectPath,
      startedAt: this._startedAt,
      warmupPeriodMs: this._warmupPeriodMs,
      debounceMs: this.debounceMs,
      lastChangeEvents: this._lastChangeEvents,
      clearDebounce: () => this._clearDebounce(),
      onChange: this.onChange,
      logger,
      recordStartupNoiseSuppressed: () => {
        this._startupNoiseSuppressed += 1;
      }
    });
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
