/**
 * @fileoverview Stats Manager
 * 
 * Single Responsibility: Manage aggregated statistics
 * 
 * @module tunnel-vision-logger/stats/stats-manager
 */

import fs from 'fs/promises';
import { TUNNEL_VISION_STATS } from '../utils/paths.js';

/**
 * Default stats structure
 */
export function createDefaultStats() {
  return {
    totalEvents: 0,
    eventsBySeverity: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    },
    avgAffectedFiles: 0,
    mostFrequentFiles: {},
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Load stats from file or create default
 * @returns {Promise<Object>} Stats object
 */
export async function loadStats() {
  try {
    const content = await fs.readFile(TUNNEL_VISION_STATS, 'utf-8');
    return JSON.parse(content);
  } catch {
    return createDefaultStats();
  }
}

/**
 * Save stats to file
 * @param {Object} stats - Stats to save
 */
export async function saveStats(stats) {
  stats.lastUpdated = new Date().toISOString();
  await fs.writeFile(TUNNEL_VISION_STATS, JSON.stringify(stats, null, 2), 'utf-8');
}

/**
 * Update stats with new event
 * @param {Object} stats - Current stats
 * @param {Object} event - New event
 * @returns {Object} Updated stats
 */
export function updateStatsWithEvent(stats, event) {
  const newStats = { ...stats };
  
  // Increment counters
  newStats.totalEvents++;
  newStats.eventsBySeverity[event.severity] =
    (newStats.eventsBySeverity[event.severity] || 0) + 1;

  // Update average
  newStats.avgAffectedFiles =
    (newStats.avgAffectedFiles * (newStats.totalEvents - 1) +
      event.affectedFiles?.unmodified || 0) /
    newStats.totalEvents;

  // Track most frequent files
  const file = event.modifiedFile;
  if (!newStats.mostFrequentFiles[file]) {
    newStats.mostFrequentFiles[file] = 0;
  }
  newStats.mostFrequentFiles[file]++;

  return newStats;
}

/**
 * Get stats
 * @returns {Promise<Object>} Current stats
 */
export async function getStats() {
  return loadStats();
}
