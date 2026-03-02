/**
 * @fileoverview Logger Formatters
 * @module shared/logger-formatters
 */

const ENV = process.env.NODE_ENV || 'development';
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 5
};

const COLORS = {
  DEBUG: '\x1b[36m',
  INFO: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  FATAL: '\x1b[35m',
  RESET: '\x1b[0m'
};

export function formatAsJSON(timestamp, levelName, namespace, message, meta) {
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

export function formatAsPretty(timestamp, levelName, namespace, message, meta) {
  const color = COLORS[levelName] || '';
  const reset = COLORS.RESET;
  const shortNamespace = namespace.replace('OmnySys:', '');
  let output = `${color}[${levelName}]${reset} [${shortNamespace}] ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    const metaStr = Object.entries(meta)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    output += ` {${metaStr}}`;
  }

  return output;
}

export function formatMessage(level, namespace, message, meta, format) {
  const timestamp = new Date().toISOString();
  const levelName = Object.keys(LogLevel).find(k => LogLevel[k] === level);

  if (format === 'json') {
    return formatAsJSON(timestamp, levelName, namespace, message, meta);
  }

  return formatAsPretty(timestamp, levelName, namespace, message, meta);
}
