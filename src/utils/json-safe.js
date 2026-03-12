/**
 * @fileoverview json-safe.js
 *
 * Safe JSON operations with error handling.
 * Prevents crashes from corrupted JSON files and normalizes persisted
 * structured-field access without binding to any domain model.
 *
 * @module utils/json-safe
 */

import fs from 'fs/promises';
import { createLogger } from './logger.js';

const logger = createLogger('OmnySys:json:safe');

/**
 * Safely read and parse a JSON file.
 * @param {string} filePath
 * @param {*} defaultValue
 * @returns {Promise<*>}
 */
export async function safeReadJson(filePath, defaultValue = null) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    if (error instanceof SyntaxError) {
      logger.warn(`[safeReadJson] Invalid JSON in ${filePath}: ${error.message}`);
      return defaultValue;
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      logger.error(`[safeReadJson] Permission denied reading ${filePath}`);
      return defaultValue;
    }
    logger.error(`[safeReadJson] Error reading ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Safely write data to a JSON file.
 * @param {string} filePath
 * @param {*} data
 * @param {number} indent
 * @returns {Promise<boolean>}
 */
export async function safeWriteJson(filePath, data, indent = 2) {
  try {
    const content = JSON.stringify(data, null, indent);
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    logger.error(`[safeWriteJson] Error writing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Safely parse JSON text.
 * @param {string} jsonString
 * @param {*} defaultValue
 * @returns {*}
 */
export function safeParseJson(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error('[safeParseJson] Invalid JSON string:', error.message);
    }
    return defaultValue;
  }
}

/**
 * Detects whether a persisted value contains meaningful structured content.
 * This is storage-oriented and domain-agnostic.
 * @param {*} value
 * @returns {boolean}
 */
export function hasPersistedStructuredValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;

  const normalized = String(value).trim();
  return normalized !== '' && normalized !== '[]' && normalized !== '{}';
}

/**
 * Safely materializes a persisted structured field that may already be parsed.
 * @param {*} value
 * @param {*} defaultValue
 * @returns {*}
 */
export function parsePersistedField(value, defaultValue = null) {
  if (value == null) return defaultValue;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  return safeParseJson(value, defaultValue);
}

/**
 * Safely materializes a persisted collection field.
 * @param {*} value
 * @param {Array} defaultValue
 * @returns {Array}
 */
export function parsePersistedArray(value, defaultValue = []) {
  const parsed = parsePersistedField(value, defaultValue);
  return Array.isArray(parsed) ? parsed : defaultValue;
}

/**
 * Safely stringify data to JSON.
 * @param {*} data
 * @param {number} indent
 * @returns {string}
 */
export function safeStringifyJson(data, indent = 2) {
  try {
    return JSON.stringify(data, null, indent);
  } catch (error) {
    logger.error('[safeStringifyJson] Error stringifying:', error.message);
    return '{}';
  }
}

/**
 * Check if a string is valid JSON.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
