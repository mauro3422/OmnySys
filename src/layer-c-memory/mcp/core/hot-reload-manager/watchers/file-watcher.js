import { watch } from 'fs';
import path from 'path';

import { createLogger } from '../../../../utils/logger.js';
import { buildFileWatcherStats, processFileWatcherChange } from './file-watcher-helpers.js';

const logger = createLogger('OmnySys:hot-reload:watcher');

export class FileWatcher {
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

  stop() {
    this._clearDebounce();
    this._lastChangeEvents.clear();

    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
      logger.info('File watcher stopped');
    }
  }

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

  _clearDebounce() {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
      this._debounceTimeout = null;
    }
  }

  isWatching() {
    return !!this.fsWatcher;
  }

  getFileWatcherStats() {
    return buildFileWatcherStats(this._startupNoiseSuppressed, this.isWatching());
  }
}

export default FileWatcher;
