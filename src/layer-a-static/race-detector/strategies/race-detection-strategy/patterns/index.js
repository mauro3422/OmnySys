/**
 * @fileoverview index.js
 * 
 * Public API for race condition patterns.
 * Exports the PatternRegistry class, built-in patterns, and a default registry instance.
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns
 */

export { PatternRegistry } from './PatternRegistry.js';
export { BUILTIN_PATTERNS } from './builtin-patterns.js';

import { PatternRegistry } from './PatternRegistry.js';

/**
 * Default registry instance with built-in patterns pre-registered
 * @type {PatternRegistry}
 */
export const defaultRegistry = new PatternRegistry();

export default PatternRegistry;
