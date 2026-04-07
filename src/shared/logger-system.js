/**
 * @fileoverview Logger System - Sistema de Logging Robusto
 *
 * @module shared/logger-system
 * @version 3.2.0
 */

import { LogLevel } from './logger-config.js';
export { LogLevel };
import { getNamespaceConfig } from './logger-config.js';
import { formatMessage } from './logger-formatters.js';

/**
 * Enhanced Logger with namespace support.
 * Transforms raw input → enriched meta → formatted output → dispatched.
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
    if (!this.isEnabled(level)) return null;

    // Transform: normalize message
    const normalizedMsg = typeof message === 'string' ? message.trim() : String(message);

    // Transform: normalize meta (filter null/undefined)
    const baseMeta = meta && typeof meta === 'object' ? meta : {};
    const cleanMeta = {};
    for (const [key, value] of Object.entries(baseMeta)) {
      if (value !== undefined && value !== null) cleanMeta[key] = value;
    }

    // Transform: enrich with context
    const enrichedMeta = {
      ...cleanMeta,
      timestamp: new Date().toISOString(),
      ns: this.namespace
    };
    if (process.env.NODE_ENV === 'development') {
      enrichedMeta.env = 'development';
    }

    // Transform: format for output
    const formatted = formatMessage(level, this.namespace, normalizedMsg, enrichedMeta, this.config.format);

    // Dispatch: write to appropriate console stream
    const writer = level >= LogLevel.ERROR ? console.error : level === LogLevel.WARN ? console.warn : console.info;
    writer(formatted);

    return { input: { level, message: normalizedMsg, meta: cleanMeta }, output: { level, formatted }, enrichedMeta };
  }

  debug(message, meta) { return this.log(LogLevel.DEBUG, message, meta); }
  info(message, meta) { return this.log(LogLevel.INFO, message, meta); }
  warn(message, meta) { return this.log(LogLevel.WARN, message, meta); }
  error(message, meta) { return this.log(LogLevel.ERROR, message, meta); }
  fatal(message, meta) { return this.log(LogLevel.FATAL, message, meta); }

  trace(correlationId, message, meta = {}) {
    return this.info(message, { ...meta, correlationId, trace: true });
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
    return this.error(message || error.message, {
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

/**
 * Convenience log function — explicitly delegates to rootLogger instance.
 */
export function log(level, message, meta) {
  const numericLevel = LogLevel[level.toUpperCase()] ?? LogLevel.INFO;
  return rootLogger.log(numericLevel, message, meta);
}

export default { createLogger, Logger, rootLogger, LogLevel, log };
