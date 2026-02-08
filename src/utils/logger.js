/**
 * @fileoverview logger.js
 * 
 * Centralized logging service
 * Replaces console.log/error scattered throughout codebase
 * 
 * @module utils/logger
 */

export class Logger {
  constructor(name, options = {}) {
    this.name = name;
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.prefix = `[${name}]`;
  }

  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  _format(message, level) {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${level.toUpperCase()} ${this.prefix} ${message}`;
  }

  debug(message, ...args) {
    if (this._shouldLog('debug')) {
      console.debug(this._format(message, 'debug'), ...args);
    }
  }

  info(message, ...args) {
    if (this._shouldLog('info')) {
      console.info(this._format(message, 'info'), ...args);
    }
  }

  warn(message, ...args) {
    if (this._shouldLog('warn')) {
      console.warn(this._format(message, 'warn'), ...args);
    }
  }

  error(message, error, ...args) {
    if (this._shouldLog('error')) {
      console.error(this._format(message, 'error'), error?.message || '', ...args);
      if (error?.stack && process.env.LOG_LEVEL === 'debug') {
        console.error(error.stack);
      }
    }
  }
}

// Factory function
export function createLogger(name, options) {
  return new Logger(name, options);
}

// Default logger
export const logger = new Logger('OmnySys');
