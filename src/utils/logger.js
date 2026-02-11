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
    // User-friendly mode: no mostrar prefijos técnicos
    this.userFriendly = process.env.NODE_ENV === 'production' || true;
  }

  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  _format(message, level) {
    // En modo user-friendly, solo mostrar el mensaje sin prefijos técnicos
    if (this.userFriendly) {
      return message;
    }
    // En modo debug, mostrar level y prefix
    return `${level.toUpperCase()} ${this.prefix} ${message}`;
  }

  debug(message, ...args) {
    if (this._shouldLog('debug')) {
      process.stderr.write(this._format(message, 'debug') + '\n');
    }
  }

  info(message, ...args) {
    if (this._shouldLog('info')) {
      // Usar stderr para consistencia con MCP (está redirigido a archivo)
      process.stderr.write(this._format(message, 'info') + '\n');
    }
  }

  warn(message, ...args) {
    if (this._shouldLog('warn')) {
      process.stderr.write(this._format(message, 'warn') + '\n');
    }
  }

  error(message, error, ...args) {
    if (this._shouldLog('error')) {
      const formatted = this._format(message, 'error');
      const errorMsg = error?.message ? ` ${error.message}` : '';
      process.stderr.write(formatted + errorMsg + '\n');
      if (error?.stack && process.env.LOG_LEVEL === 'debug') {
        process.stderr.write(error.stack + '\n');
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
