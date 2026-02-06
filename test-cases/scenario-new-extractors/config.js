/**
 * Config Hub
 * Tests: config-hub archetype detector
 * Expected: Detected as config-hub (5+ exports, 5+ dependents, 0-2 functions)
 *
 * NOTE: To trigger detection, this file needs to be imported by 5+ other files
 */

export const DB_HOST = 'localhost';
export const DB_PORT = 27017;
export const API_KEY = 'secret-key';
export const API_URL = 'https://api.example.com';
export const TIMEOUT = 5000;
export const MAX_RETRIES = 3;
export const CACHE_TTL = 3600;

// Only 1 function (meets config-hub criteria: functionCount <= 2)
export function getEnv() {
  return process.env.NODE_ENV || 'development';
}
