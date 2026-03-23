/**
 * @fileoverview Error Classifier Statistics
 * 
 * Utility functions for classification statistics and history management.
 * 
 * @module core/error-guardian/handlers/error-classifier/utils/stats
 */

/**
 * Get classification statistics
 * @param {Array} history - Classification history
 * @returns {Object} - Statistics by type and severity
 */
import { getGuardianStats } from '../../../utils/shared-stats.js';
export const getClassifierStats = (...args) => getGuardianStats('error-classifier', ...args);
export const getStats = (...args) => getClassifierStats(...args);
