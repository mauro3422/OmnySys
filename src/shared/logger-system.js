/**
 * @fileoverview Logger System - Sistema de Logging Robusto
 * 
 * Features:
 * - Jerarquía de namespaces (OmnySys:core:file-watcher)
 * - Niveles configurables por namespace
 * - Formato JSON para producción / pretty para desarrollo
 * - Redirección a múltiples transports (console, file, remote)
 * - Contexto estructurado y correlation IDs
 * 
 * @module shared/logger-system
 * @version 2.0.0
 */

import { Logger as BaseLogger } from '../utils/logger.js';

/**
 * Log Levels
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 5
};

/**
 * Environment-based configuration
 */
const ENV = process.env.NODE_ENV || 'development';
const GLOBAL_LOG_LEVEL = process.env.LOG_LEVEL || (ENV === 'production' ? 'info' : 'debug');

/**
 * Logger configuration by namespace pattern
 */
const NAMESPACE_CONFIG = {
  // Default for all loggers
  '*': {
    level: GLOBAL_LOG_LEVEL,
    format: ENV === 'production' ? 'json' : 'pretty',
    transports: ['console']
  },
  
  // Core system - verbose
  'OmnySys:core:*': {
    level: 'debug',
    format: 'pretty'
  },
  
  // File watcher - very verbose
  'OmnySys:core:file-watcher': {
    level: 'info'  // Reduce noise
  },
  
  // Layer A - extraction phase
  'OmnySys:layer-a:*': {
    level: 'info'
  },
  
  // Layer B - semantic analysis
  'OmnySys:layer-b:*': {
    level: 'info'
  },
  
  // Layer C - serving
  'OmnySys:layer-c:*': {
    level: 'info'
  },
  
  // Race detector - important
  'OmnySys:race-detector': {
    level: 'debug'
  },
  
  // Validation - always visible
  'OmnySys:validator': {
    level: 'debug',
    format: 'pretty'
  }
};

/**
 * Get configuration for a namespace
 */
function getNamespaceConfig(namespace) {
  // Find most specific match
  const patterns = Object.keys(NAMESPACE_CONFIG).sort((a, b) => b.length - a.length);
  
  for (const pattern of patterns) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(namespace)) {
      return { ...NAMESPACE_CONFIG['*'], ...NAMESPACE_CONFIG[pattern] };
    }
  }
  
  return NAMESPACE_CONFIG['*'];
}

/**
 * Format log message
 */
function formatMessage(level, namespace, message, meta, format) {
  const timestamp = new Date().toISOString();
  const levelName = Object.keys(LogLevel).find(k => LogLevel[k] === level);
  
  if (format === 'json') {
    return JSON.stringify({
      timestamp,
      level: levelName,
      namespace,
      message,
      ...meta,
      pid: process.pid,
      env: ENV
    });
  }
  
  // Pretty format
  const colors = {
    DEBUG: '\x1b[36m',  // Cyan
    INFO: '\x1b[32m',   // Green
    WARN: '\x1b[33m',   // Yellow
    ERROR: '\x1b[31m',  // Red
    FATAL: '\x1b[35m',  // Magenta
    RESET: '\x1b[0m'
  };
  
  const color = colors[levelName] || '';
  const reset = colors.RESET;
  
  // Shorten namespace for display
  const shortNamespace = namespace.replace('OmnySys:', '');
  
  let output = `${timestamp} ${color}[${levelName}]${reset} [${shortNamespace}] ${message}`;
  
  if (meta && Object.keys(meta).length > 0) {
    const metaStr = Object.entries(meta)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    output += ` {${metaStr}}`;
  }
  
  return output;
}

/**
 * Enhanced Logger with namespace support
 */
export class Logger {
  constructor(namespace = 'OmnySys') {
    this.namespace = namespace;
    this.config = getNamespaceConfig(namespace);
    this.level = LogLevel[this.config.level.toUpperCase()] ?? LogLevel.INFO;
    
    // Create child loggers cache
    this.children = new Map();
  }

  /**
   * Create a child logger with extended namespace
   */
  child(subNamespace) {
    const fullNamespace = `${this.namespace}:${subNamespace}`;
    
    if (!this.children.has(fullNamespace)) {
      this.children.set(fullNamespace, new Logger(fullNamespace));
    }
    
    return this.children.get(fullNamespace);
  }

  /**
   * Check if level is enabled
   */
  isEnabled(level) {
    return level >= this.level;
  }

  /**
   * Log a message
   */
  log(level, message, meta = {}) {
    if (!this.isEnabled(level)) return;
    
    const formatted = formatMessage(level, this.namespace, message, meta, this.config.format);
    
    // Output to console (can be extended to file, remote, etc.)
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.info(formatted);
    }
  }

  // Convenience methods
  debug(message, meta) { this.log(LogLevel.DEBUG, message, meta); }
  info(message, meta) { this.log(LogLevel.INFO, message, meta); }
  warn(message, meta) { this.log(LogLevel.WARN, message, meta); }
  error(message, meta) { this.log(LogLevel.ERROR, message, meta); }
  fatal(message, meta) { this.log(LogLevel.FATAL, message, meta); }

  /**
   * Log with correlation ID for tracing
   */
  trace(correlationId, message, meta = {}) {
    this.info(message, { ...meta, correlationId, trace: true });
  }

  /**
   * Time an operation
   */
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

  /**
   * Log errors with stack traces
   */
  exception(error, message, meta = {}) {
    this.error(message || error.message, {
      ...meta,
      error: error.message,
      stack: ENV === 'development' ? error.stack : undefined,
      type: error.constructor.name
    });
  }
}

/**
 * Root logger instance
 */
export const rootLogger = new Logger('OmnySys');

/**
 * Create a logger for a module
 */
export function createLogger(namespace) {
  return new Logger(namespace);
}

/**
 * Global configuration
 */
export function configureLogging(config) {
  Object.assign(NAMESPACE_CONFIG, config);
}

/**
 * Enable/disable all logging
 */
export function setGlobalLevel(level) {
  NAMESPACE_CONFIG['*'].level = level;
}

// Legacy compatibility
export default { createLogger, Logger, rootLogger, LogLevel };
