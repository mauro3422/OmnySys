/**
 * @fileoverview logger.js
 * 
 * Centralized logging service
 * Replaces console.log/error scattered throughout codebase
 * 
 * @module utils/logger
 */

import { isBugModeEnabled } from '../shared/runtime-debug-flags.js';
import { createLogger as canonicalCreateLogger } from '../shared/logger-system.js';

let notificationBridge = null;
const recentLogs = [];
const MAX_RECENT = 50;
const FORCE_ASCII_LOGS = process.env.OMNYSYS_FORCE_ASCII_LOGS !== '0'
  && (process.platform === 'win32' || process.env.OMNYSYS_FORCE_ASCII_LOGS === '1');

const LOG_REPLACEMENTS = [
  [/\u2192/g, '->'],
  [/\u2190/g, '<-'],
  [/[\u2014\u2013\u2212]/g, '-'],
  [/\u2705|\u2714|\u2713/g, '[OK]'],
  [/\u26A0\uFE0F?|\u26A0/g, '[WARN]']
];

export function sanitizeLogText(value = '') {
  let text = String(value ?? '');

  if (!FORCE_ASCII_LOGS) {
    return text;
  }

  for (const [pattern, replacement] of LOG_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .normalize('NFKD')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

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
    this.level = options.level || (isBugModeEnabled() ? 'debug' : process.env.LOG_LEVEL || 'info');
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
      return sanitizeLogText(message);
    }
    // En modo debug, mostrar level y prefix
    return `${level.toUpperCase()} ${this.prefix} ${sanitizeLogText(message)}`;
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
      if (error instanceof Error && error.stack && (process.env.LOG_LEVEL === 'debug' || isBugModeEnabled())) {
        process.stderr.write(sanitizeLogText(error.stack) + '\n');
      }
    }
  }
}

// Factory function
export function createLogger(name, options) {
  return canonicalCreateLogger(name, options);
}

// Default logger
export const logger = new Logger('OmnySys');
