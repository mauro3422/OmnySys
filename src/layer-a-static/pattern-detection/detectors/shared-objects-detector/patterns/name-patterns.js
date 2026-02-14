/**
 * @fileoverview Name Pattern Detectors
 * 
 * Detect object types based on naming conventions
 * 
 * @module shared-objects-detector/patterns/name-patterns
 */

/**
 * Config object patterns
 */
const CONFIG_PATTERNS = [
  /^CONFIG$/i, /^SETTINGS$/i, /^OPTIONS$/i,
  /^DEFAULTS$/i, /^CONSTANTS$/i, /^ENV$/i,
  /^CFG$/i, /^CONF$/i
];

/**
 * State object patterns
 */
const STATE_PATTERNS = [
  /store$/i, /state$/i, /manager$/i,
  /cache$/i, /registry$/i, /pool$/i, /queue$/i,
  /buffer$/i, /stack$/i, /heap$/i,
  /global$/i, /shared$/i, /mutable$/i,
  /context$/i, /provider$/i
];

/**
 * Utils object patterns
 */
const UTILS_PATTERNS = [
  /utils?$/i, /helpers?$/i, /tools?$/i,
  /lib$/i, /library$/i, /common$/i,
  /shared\/utils/i
];

/**
 * Check if name suggests config
 * @param {string} name - Object name
 * @returns {boolean}
 */
export function isConfigObject(name) {
  return CONFIG_PATTERNS.some(p => p.test(name));
}

/**
 * Check if name suggests state
 * @param {string} name - Object name
 * @param {Object} obj - Object data
 * @param {string} filePath - File path
 * @returns {boolean}
 */
export function isStateObject(name, obj, filePath) {
  const matchesPattern = STATE_PATTERNS.some(p => p.test(name));
  if (!matchesPattern) return false;
  
  // If in types file, probably enum
  const isInTypesFile = filePath && (
    /config\/(change-)?types/i.test(filePath) ||
    /config\/constants/i.test(filePath) ||
    /types\.js$/i.test(filePath)
  );
  
  return !isInTypesFile;
}

/**
 * Check if name suggests utils
 * @param {string} name - Object name
 * @returns {boolean}
 */
export function isUtilsObject(name) {
  return UTILS_PATTERNS.some(p => p.test(name));
}
