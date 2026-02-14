/**
 * @fileoverview Session ID Generator
 * 
 * @module tunnel-vision-logger/utils/session
 */

/**
 * Generate unique session ID
 * @returns {string} Session ID
 */
export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
