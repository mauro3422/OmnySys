/**
 * @fileoverview PatternRegistry.js
 * 
 * Central registry for race condition patterns. Provides extensible
 * pattern management with support for registration, lookup, and
 * categorization of different race types.
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/PatternRegistry
 */

import { BUILTIN_PATTERNS } from './builtin-patterns.js';

/**
 * @typedef {Object} RacePattern
 * @property {string} type - Pattern type code (e.g., 'RW', 'WW')
 * @property {string} name - Human-readable name
 * @property {string} description - Pattern description
 * @property {Function} matcher - Function to check if accesses match pattern
 * @property {string} severity - Default severity ('low'|'medium'|'high'|'critical')
 * @property {Array<string>} mitigationStrategies - Suggested mitigation approaches
 */

/** Registry for race condition patterns */
export class PatternRegistry {
  constructor() {
    /** @type {Map<string, RacePattern>} */
    this._patterns = new Map();
    /** @type {Map<string, Set<string>>} */
    this._categories = new Map();
    this._registerBuiltinPatterns();
  }

  /**
   * Register a new pattern
   * @param {string} type - Pattern type code
   * @param {RacePattern} pattern - Pattern definition
   * @param {string} [category='general'] - Pattern category
   * @returns {PatternRegistry} - This registry (for chaining)
   */
  register(type, pattern, category = 'general') {
    if (!type || typeof type !== 'string') {
      throw new Error('Pattern type must be a non-empty string');
    }
    if (!pattern.matcher || typeof pattern.matcher !== 'function') {
      throw new Error('Pattern must have a matcher function');
    }

    const fullPattern = {
      type,
      name: pattern.name || type,
      description: pattern.description || '',
      matcher: pattern.matcher,
      severity: pattern.severity || 'medium',
      mitigationStrategies: pattern.mitigationStrategies || [],
      ...pattern
    };

    this._patterns.set(type, fullPattern);
    
    if (!this._categories.has(category)) {
      this._categories.set(category, new Set());
    }
    this._categories.get(category).add(type);

    return this;
  }

  /**
   * Unregister a pattern
   * @param {string} type - Pattern type code
   * @returns {boolean} - True if pattern was removed
   */
  unregister(type) {
    for (const [category, types] of this._categories) {
      types.delete(type);
      if (types.size === 0) {
        this._categories.delete(category);
      }
    }
    return this._patterns.delete(type);
  }

  /**
   * Get a pattern by type
   * @param {string} type - Pattern type code
   * @returns {RacePattern|undefined} - Pattern definition or undefined
   */
  get(type) {
    return this._patterns.get(type);
  }

  /**
   * Check if a pattern is registered
   * @param {string} type - Pattern type code
   * @returns {boolean} - True if pattern exists
   */
  has(type) {
    return this._patterns.has(type);
  }

  /** @returns {Array<string>} - Array of pattern types */
  getAllTypes() {
    return Array.from(this._patterns.keys());
  }

  /** @returns {Array<RacePattern>} - Array of patterns */
  getAllPatterns() {
    return Array.from(this._patterns.values());
  }

  /**
   * Get patterns by category
   * @param {string} category - Pattern category
   * @returns {Array<RacePattern>} - Array of patterns in category
   */
  getByCategory(category) {
    const types = this._categories.get(category);
    if (!types) return [];
    return Array.from(types).map(type => this._patterns.get(type));
  }

  /** @returns {Array<string>} - Array of category names */
  getCategories() {
    return Array.from(this._categories.keys());
  }

  /**
   * Match accesses against all registered patterns
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} [context={}] - Additional context for matching
   * @returns {Array<RacePattern>} - Matching patterns
   */
  matchAll(access1, access2, context = {}) {
    const matches = [];
    for (const pattern of this._patterns.values()) {
      try {
        if (pattern.matcher(access1, access2, context)) {
          matches.push(pattern);
        }
      } catch (err) {
        // Silently ignore matcher errors
      }
    }
    return matches;
  }

  /**
   * Match accesses against a specific pattern type
   * @param {string} type - Pattern type code
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} [context={}] - Additional context
   * @returns {boolean} - True if matches
   */
  match(type, access1, access2, context = {}) {
    const pattern = this._patterns.get(type);
    if (!pattern) return false;
    try {
      return pattern.matcher(access1, access2, context);
    } catch (err) {
      return false;
    }
  }

  /**
   * Get default severity for a pattern type
   * @param {string} type - Pattern type code
   * @returns {string} - Severity level
   */
  getSeverity(type) {
    return this._patterns.get(type)?.severity || 'medium';
  }

  /**
   * Get mitigation strategies for a pattern type
   * @param {string} type - Pattern type code
   * @returns {Array<string>} - Mitigation strategies
   */
  getMitigationStrategies(type) {
    return this._patterns.get(type)?.mitigationStrategies || [];
  }

  /** Clear all registered patterns */
  clear() {
    this._patterns.clear();
    this._categories.clear();
  }

  /** Register built-in race condition patterns @private */
  _registerBuiltinPatterns() {
    for (const { type, pattern, category } of BUILTIN_PATTERNS) {
      this.register(type, pattern, category);
    }
  }
}

export default PatternRegistry;
