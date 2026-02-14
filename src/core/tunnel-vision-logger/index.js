/**
 * @fileoverview Tunnel Vision Logger - Main Entry Point
 * 
 * Recolecta y almacena eventos de tunnel vision detectados
 * para análisis posterior y entrenamiento de Artificial Intuition.
 * 
 * Refactored following SOLID principles:
 * - SRP: Each module has single responsibility
 * - OCP: Easy to add new analysis types
 * - DIP: Depends on abstractions
 * 
 * @module tunnel-vision-logger
 */

import { logTunnelVisionEvent, readAllEvents } from './events/event-logger.js';
import { loadStats, updateStatsWithEvent, saveStats } from './stats/stats-manager.js';
import { analyzePatterns } from './analysis/pattern-analyzer.js';
import { exportToCSV } from './reports/csv-exporter.js';
import { generateSessionId } from './utils/session.js';

/**
 * Log a tunnel vision event with stats update
 * @param {Object} alert - Alert data
 * @param {Object} context - Context data
 * @returns {Promise<Object|null>} Logged event
 */
export async function logEvent(alert, context = {}) {
  const event = await logTunnelVisionEvent(alert, context);
  
  if (event) {
    const stats = await loadStats();
    const updatedStats = updateStatsWithEvent(stats, event);
    await saveStats(updatedStats);
  }
  
  return event;
}

/**
 * Get statistics
 * @returns {Promise<Object>} Stats
 */
export async function getStats() {
  return loadStats();
}

// Re-export all functions
export {
  logTunnelVisionEvent,
  readAllEvents,
  loadStats,
  updateStatsWithEvent,
  saveStats,
  analyzePatterns,
  exportToCSV,
  generateSessionId
};

// Default export
export default {
  logEvent,
  getStats,
  readAllEvents,
  analyzePatterns,
  exportToCSV,
  generateSessionId
};
