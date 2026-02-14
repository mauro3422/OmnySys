/**
 * @fileoverview index.js
 *
 * Tunnel Vision Logger - Main entry point (backward compatible)
 *
 * Recolecta y almacena eventos de tunnel vision detectados
 * para análisis posterior y entrenamiento de Artificial Intuition.
 *
 * @module core/tunnel-vision-logger
 */

import { logTunnelVisionEvent, readAllEvents } from './events/logger.js';
import { getStats } from './stats/calculator.js';
import { analyzePatterns } from './stats/analyzer.js';
import { exportToCSV } from './storage/exporter.js';

export {
  logTunnelVisionEvent,
  readAllEvents,
  getStats,
  analyzePatterns,
  exportToCSV
};

export default {
  logTunnelVisionEvent,
  readAllEvents,
  getStats,
  analyzePatterns,
  exportToCSV
};
