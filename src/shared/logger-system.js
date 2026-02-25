/**
 * @fileoverview Logger System - Sistema de Logging Robusto
 *
 * @module shared/logger-system
 * @version 3.0.0
 */

import { LogLevel } from './logger-config.js';
import { getNamespaceConfig } from './logger-config.js';
import { formatMessage } from './logger-formatters.js';

/**
 * Enhanced Logger with namespace support
 */
export class Logger {
  constructor(namespace = 'OmnySys') {
    this.namespace = namespace;
    this.config = getNamespaceConfig(namespace);
    this.level = LogLevel[this.config.level.toUpperCase()] ?? LogLevel.INFO;
    this.children = new Map();
  }

  child(subNamespace) {
    const fullNamespace = `${this.namespace}:${subNamespace}`;
    if (!this.children.has(fullNamespace)) {
      this.children.set(fullNamespace, new Logger(fullNamespace));
    }
    return this.children.get(fullNamespace);
  }

  isEnabled(level) {
    return level >= this.level;
  }

  log(level, message, meta = {}) {
    if (!this.isEnabled(level)) return;
    const formatted = formatMessage(level, this.namespace, message, meta, this.config.format);
    this._output(level, formatted);
  }

  _output(level, formatted) {
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.info(formatted);
    }
  }

  debug(message, meta) { this.log(LogLevel.DEBUG, message, meta); }
  info(message, meta) { this.log(LogLevel.INFO, message, meta); }
  warn(message, meta) { this.log(LogLevel.WARN, message, meta); }
  error(message, meta) { this.log(LogLevel.ERROR, message, meta); }
  fatal(message, meta) { this.log(LogLevel.FATAL, message, meta); }

  trace(correlationId, message, meta = {}) {
    this.info(message, { ...meta, correlationId, trace: true });
  }

  time(label, fn) {
    const start = Date.now();
    this.debug(`Starting: ${label}`);
    const done = () => {
      const duration = Date.now() - start;
      this.debug(`Completed: ${label}`, { duration });
      return duration;
    };
    if (fn) {
      try {
        const result = fn();
        if (result && typeof result.then === 'function') {
          return result.finally(done);
        }
        done();
        return result;
      } catch (error) {
        done();
        throw error;
      }
    }
    return done;
  }

  exception(error, message, meta = {}) {
    this.error(message || error.message, {
      ...meta,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      type: error.constructor.name
    });
  }
}

export const rootLogger = new Logger('OmnySys');

export function createLogger(namespace) {
  return new Logger(namespace);
}

let _configModule = null;
let _configModulePromise = null;

function getConfigModulePromise() {
  if (!_configModulePromise) {
    _configModulePromise = import('./logger-config.js');
  }
  return _configModulePromise;
}

export async function configureLogging(config) {
  const { NAMESPACE_CONFIG } = await getConfigModulePromise();
  Object.assign(NAMESPACE_CONFIG, config);
}

export async function setGlobalLevel(level) {
  const { NAMESPACE_CONFIG } = await getConfigModulePromise();
  NAMESPACE_CONFIG['*'].level = level;
}

export default { createLogger, Logger, rootLogger, LogLevel };
