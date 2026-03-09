/**
 * @fileoverview Legacy compatibility wrapper for tunnel vision stats
 *
 * Canonical stats persistence now lives in `stats-manager.js`.
 * Keep this file as a thin shim for older imports.
 *
 * @module core/tunnel-vision-logger/stats/calculator
 */

import {
  loadStats as loadCanonicalStats,
  saveStats,
  updateStatsWithEvent
} from './stats-manager.js';

export async function loadStats() {
  return loadCanonicalStats();
}

export async function updateStats(event) {
  const stats = await loadCanonicalStats();
  const updatedStats = updateStatsWithEvent(stats, event);
  await saveStats(updatedStats);
}

import { statsPool } from '../../../shared/utils/stats-pool.js';
export const getStats = (...args) => statsPool.getStats('calculator', ...args);