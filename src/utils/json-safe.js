/**
 * @fileoverview json-safe.js
 * 
 * Safe JSON operations with error handling
 * Prevents crashes from corrupted JSON files
 * 
 * @module utils/json-safe
 */

import fs from 'fs/promises';
import { createLogger } from './logger.js';

const logger = createLogger('OmnySys:json:safe');

/**
 * Safely read and parse a JSON file
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Value to return if file doesn't exist or is invalid
 * @returns {Promise<*>} - Parsed JSON or defaultValue
 */
export async function safeReadJson(filePath, defaultValue = null) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - not an error, just return default
      return defaultValue;
    }
    if (error instanceof SyntaxError) {
      // Invalid JSON - log and return default
      logger.warn(`[safeReadJson] Invalid JSON in ${filePath}: ${error.message}`);
      return defaultValue;
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      // Permission denied
      logger.error(`[safeReadJson] Permission denied reading ${filePath}`);
      return defaultValue;
    }
    // Other errors
    logger.error(`[safeReadJson] Error reading ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Safely write data to a JSON file
 * @param {string} filePath - Path to JSON file
 * @param {*} data - Data to write
 * @param {number} indent - JSON indentation (default: 2)
 * @returns {Promise<boolean>} - True if successful, false otherwise
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
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Value to return if parsing fails
 * @returns {*} - Parsed JSON or defaultValue
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
 * Safely stringify data to JSON
 * @param {*} data - Data to stringify
 * @param {number} indent - JSON indentation (default: 2)
 * @returns {string} - JSON string or empty object
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
 * Check if a string is valid JSON
 * @param {string} str - String to check
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
