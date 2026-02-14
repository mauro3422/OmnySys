/**
 * @fileoverview Error Logger
 * 
 * Log errors to file and memory
 * 
 * @module error-guardian/guardian/logging/error-logger
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Create error logger
 * @param {string} projectPath - Project path
 * @param {Array} errorLog - Error log array
 * @param {Object} stats - Statistics object
 * @returns {Function} Logger function
 */
export function createErrorLogger(projectPath, errorLog, stats) {
  return async function logError(errorData) {
    // Add to memory
    errorLog.push(errorData);
    stats.totalErrors++;

    // Update statistics
    stats.byType[errorData.type] = (stats.byType[errorData.type] || 0) + 1;
    stats.bySeverity[errorData.severity] = (stats.bySeverity[errorData.severity] || 0) + 1;

    // Save to file
    await saveToFile(projectPath, stats, errorLog);
  };
}

/**
 * Save errors to file
 */
async function saveToFile(projectPath, stats, errorLog) {
  const logPath = path.join(projectPath, 'logs', 'error-guardian.json');
  try {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      stats,
      recentErrors: errorLog.slice(-50)
    }, null, 2));
  } catch (e) {
    // Silent fail - we have it in memory
  }
}

/**
 * Clear error log
 * @param {string} projectPath - Project path
 */
export async function clearErrorLog(projectPath) {
  const logPath = path.join(projectPath, 'logs', 'error-guardian.json');
  try {
    await fs.unlink(logPath);
  } catch (e) {
    // File might not exist
  }
}
