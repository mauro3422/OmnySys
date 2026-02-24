/**
 * @fileoverview logger.js
 * 
 * Centralized logging service
 * Replaces console.log/error scattered throughout codebase
 * 
 * @module utils/logger
 */

let notificationBridge = null;
const recentLogs = [];
const MAX_RECENT = 50;

export function setNotificationBridge(bridge) {
  notificationBridge = bridge;
}

export function getRecentLogs() {
  return [...recentLogs];
}

export function clearRecentLogs() {
  recentLogs.length = 0;
}

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
      const extra = args.length ? ' ' + args.map(a => (a instanceof Error ? a.message : String(a))).join(' ') : '';
      const fullMessage = this._format(message, 'warn') + extra;
      process.stderr.write(fullMessage + '\n');
      recentLogs.push({ level: 'warn', message: fullMessage, time: Date.now() });
      if (recentLogs.length > MAX_RECENT) recentLogs.shift();
      // Notify global system
      if (notificationBridge?.notifyWarning) {
        notificationBridge.notifyWarning(fullMessage, this.name);
      }
    }
  }

  error(message, error, ...args) {
    if (this._shouldLog('error')) {
      const formatted = this._format(message, 'error');
      let errorMsg = '';
      if (error instanceof Error) {
        errorMsg = ` ${error.message}`;
      } else if (typeof error === 'string' && error) {
        errorMsg = ` ${error}`;
      } else if (error != null) {
        errorMsg = ` ${String(error)}`;
      }
      const fullMessage = formatted + errorMsg;
      process.stderr.write(fullMessage + '\n');
      recentLogs.push({ level: 'error', message: fullMessage, time: Date.now() });
      if (recentLogs.length > MAX_RECENT) recentLogs.shift();
      // Notify global system
      if (notificationBridge?.notifyError) {
        notificationBridge.notifyError(fullMessage, this.name);
      }
      if (error instanceof Error && error.stack && process.env.LOG_LEVEL === 'debug') {
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
