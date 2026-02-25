/**
 * @fileoverview Logger Configuration
 * @module shared/logger-config
 */

const ENV = process.env.NODE_ENV || 'development';
const GLOBAL_LOG_LEVEL = process.env.LOG_LEVEL || (ENV === 'production' ? 'info' : 'debug');

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 5
};

export const NAMESPACE_CONFIG = {
  '*': {
    level: GLOBAL_LOG_LEVEL,
    format: ENV === 'production' ? 'json' : 'pretty',
    transports: ['console']
  },
  'OmnySys:core:*': {
    level: 'debug',
    format: 'pretty'
  },
  'OmnySys:core:file-watcher': {
    level: 'info'
  },
  'OmnySys:layer-a:*': {
    level: 'info'
  },
  'OmnySys:layer-b:*': {
    level: 'info'
  },
  'OmnySys:layer-c:*': {
    level: 'info'
  },
  'OmnySys:race-detector': {
    level: 'debug'
  },
  'OmnySys:validator': {
    level: 'debug',
    format: 'pretty'
  }
};

export function getNamespaceConfig(namespace) {
  const patterns = Object.keys(NAMESPACE_CONFIG).sort((a, b) => b.length - a.length);
  for (const pattern of patterns) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(namespace)) {
      return { ...NAMESPACE_CONFIG['*'], ...NAMESPACE_CONFIG[pattern] };
    }
  }
  return NAMESPACE_CONFIG['*'];
}
