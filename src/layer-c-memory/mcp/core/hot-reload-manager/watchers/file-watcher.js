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
   * @param {string} filename - Changed file path
   */
  _handleChange(eventType, filename) {
    if (!filename || !filename.endsWith('.js')) {
      return;
    }

    this._clearDebounce();

    this._debounceTimeout = setTimeout(() => {
      this.onChange(eventType, filename);
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
}

export default FileWatcher;
