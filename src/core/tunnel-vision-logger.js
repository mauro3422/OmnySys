/**
 * @fileoverview tunnel-vision-logger.js
 * 
 * 🔄 LEGACY WRAPPER - Maintained for backward compatibility
 * 
 * This file is a thin wrapper around the new modular structure.
 * New code should import from './tunnel-vision-logger/index.js' directly.
 * 
 * @deprecated Use './tunnel-vision-logger/index.js' instead
 * @module core/tunnel-vision-logger
 */

import {
  logEvent,
  getStats,
  readAllEvents,
  analyzePatterns,
  exportToCSV,
  generateSessionId
} from './tunnel-vision-logger/index.js';

// Re-export for backward compatibility
export {
  logEvent as logTunnelVisionEvent,
  getStats,
  readAllEvents,
  analyzePatterns,
  exportToCSV,
  generateSessionId
};

// Default export
export default {
  logTunnelVisionEvent: logEvent,
  getStats,
  readAllEvents,
  analyzePatterns,
  exportToCSV,
  generateSessionId
};
