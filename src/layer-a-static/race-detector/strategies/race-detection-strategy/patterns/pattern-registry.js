/**
 * @fileoverview pattern-registry.js
 * 
 * Central registry for race condition patterns. Provides extensible
 * pattern management with support for registration, lookup, and
 * categorization of different race types.
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-registry
 */

/**
 * @typedef {Object} RacePattern
 * @property {string} type - Pattern type code (e.g., 'RW', 'WW')
 * @property {string} name - Human-readable name
 * @property {string} description - Pattern description
 * @property {Function} matcher - Function to check if accesses match pattern
 * @property {string} severity - Default severity ('low' | 'medium' | 'high' | 'critical')
 * @property {Array<string>} mitigationStrategies - Suggested mitigation approaches
 */

/**
 * Registry for race condition patterns
 * Implements extensible pattern registration and lookup
 */
export class PatternRegistry {
  constructor() {
    /** @type {Map<string, RacePattern>} */
    this._patterns = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this._categories = new Map();
    
    // Register built-in patterns
    this._registerBuiltinPatterns();
  }

  /**
   * Register a new pattern
   * 
   * @param {string} type - Pattern type code
   * @param {RacePattern} pattern - Pattern definition
   * @param {string} [category='general'] - Pattern category
   * @returns {PatternRegistry} - This registry (for chaining)
   * 
   * @example
   * registry.register('TS', {
   *   type: 'TS',
   *   name: 'Transaction-Serialization',
   *   description: 'Race in transaction serialization',
   *   matcher: (access1, access2) => access1.inTransaction && access2.inTransaction,
   *   severity: 'high'
   * });
   */
  register(type, pattern, category = 'general') {
    if (!type || typeof type !== 'string') {
      throw new Error('Pattern type must be a non-empty string');
    }

    if (!pattern.matcher || typeof pattern.matcher !== 'function') {
      throw new Error('Pattern must have a matcher function');
    }

    // Ensure required fields
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
    
    // Add to category
    if (!this._categories.has(category)) {
      this._categories.set(category, new Set());
    }
    this._categories.get(category).add(type);

    return this;
  }

  /**
   * Unregister a pattern
   * 
   * @param {string} type - Pattern type code
   * @returns {boolean} - True if pattern was removed
   */
  unregister(type) {
    // Remove from categories
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
   * 
   * @param {string} type - Pattern type code
   * @returns {RacePattern|undefined} - Pattern definition or undefined
   */
  get(type) {
    return this._patterns.get(type);
  }

  /**
   * Check if a pattern is registered
   * 
   * @param {string} type - Pattern type code
   * @returns {boolean} - True if pattern exists
   */
  has(type) {
    return this._patterns.has(type);
  }

  /**
   * Get all registered pattern types
   * 
   * @returns {Array<string>} - Array of pattern types
   */
  getAllTypes() {
    return Array.from(this._patterns.keys());
  }

  /**
   * Get all registered patterns
   * 
   * @returns {Array<RacePattern>} - Array of patterns
   */
  getAllPatterns() {
    return Array.from(this._patterns.values());
  }

  /**
   * Get patterns by category
   * 
   * @param {string} category - Pattern category
   * @returns {Array<RacePattern>} - Array of patterns in category
   */
  getByCategory(category) {
    const types = this._categories.get(category);
    if (!types) return [];
    
    return Array.from(types).map(type => this._patterns.get(type));
  }

  /**
   * Get all categories
   * 
   * @returns {Array<string>} - Array of category names
   */
  getCategories() {
    return Array.from(this._categories.keys());
  }

  /**
   * Match accesses against all registered patterns
   * 
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
   * 
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
   * 
   * @param {string} type - Pattern type code
   * @returns {string} - Severity level
   */
  getSeverity(type) {
    return this._patterns.get(type)?.severity || 'medium';
  }

  /**
   * Get mitigation strategies for a pattern type
   * 
   * @param {string} type - Pattern type code
   * @returns {Array<string>} - Mitigation strategies
   */
  getMitigationStrategies(type) {
    return this._patterns.get(type)?.mitigationStrategies || [];
  }

  /**
   * Clear all registered patterns
   */
  clear() {
    this._patterns.clear();
    this._categories.clear();
  }

  /**
   * Register built-in race condition patterns
   * @private
   */
  _registerBuiltinPatterns() {
    // Read-Write (RW) - Classic race condition
    this.register('RW', {
      name: 'Read-Write Race',
      description: 'One access reads while another writes to the same state',
      matcher: (a1, a2) => 
        (a1.type === 'read' && a2.type === 'write') ||
        (a1.type === 'write' && a2.type === 'read'),
      severity: 'high',
      category: 'data-race',
      mitigationStrategies: [
        'Use mutual exclusion (locks)',
        'Use atomic operations',
        'Copy-on-write pattern',
        'Immutable data structures'
      ]
    }, 'data-race');

    // Write-Write (WW) - Lost update
    this.register('WW', {
      name: 'Write-Write Race',
      description: 'Multiple writes to the same state without synchronization',
      matcher: (a1, a2) => a1.type === 'write' && a2.type === 'write',
      severity: 'critical',
      category: 'data-race',
      mitigationStrategies: [
        'Use exclusive locks',
        'Compare-and-swap operations',
        'Version counters',
        'Single writer pattern'
      ]
    }, 'data-race');

    // Write-Read (WR) - Similar to RW
    this.register('WR', {
      name: 'Write-Read Race',
      description: 'Write followed by unsynchronized read',
      matcher: (a1, a2) => a1.type === 'write' && a2.type === 'read',
      severity: 'high',
      category: 'data-race',
      mitigationStrategies: [
        'Use read-write locks',
        'Memory barriers',
        'Volatile reads'
      ]
    }, 'data-race');

    // Initialization Error (IE)
    this.register('IE', {
      name: 'Initialization Race',
      description: 'Race during lazy initialization of shared state',
      matcher: (a1, a2, ctx) => {
        const isInit1 = a1.isInitialization || a1.type === 'init';
        const isInit2 = a2.isInitialization || a2.type === 'init';
        return isInit1 || isInit2;
      },
      severity: 'high',
      category: 'initialization',
      mitigationStrategies: [
        'Static initialization',
        'Double-checked locking',
        'Initialization-on-demand holder',
        'Dependency injection'
      ]
    }, 'initialization');

    // Event Handler (EH)
    this.register('EH', {
      name: 'Event Handler Race',
      description: 'Race between event handler and main code',
      matcher: (a1, a2) => {
        const isEvent1 = a1.isEventHandler || a1.context === 'event';
        const isEvent2 = a2.isEventHandler || a2.context === 'event';
        return isEvent1 || isEvent2;
      },
      severity: 'medium',
      category: 'event-driven',
      mitigationStrategies: [
        'Event queue serialization',
        'State machine pattern',
        'Reactor pattern'
      ]
    }, 'event-driven');

    // Atomicity Violation (AV)
    this.register('AV', {
      name: 'Atomicity Violation',
      description: 'Check-then-act or read-modify-write not atomic',
      matcher: (a1, a2, ctx) => {
        return ctx?.isCheckThenAct || ctx?.isReadModifyWrite;
      },
      severity: 'critical',
      category: 'atomicity',
      mitigationStrategies: [
        'Atomic operations',
        'Transactions',
        'Compare-and-swap loops'
      ]
    }, 'atomicity');

    // Order Violation (OV)
    this.register('OV', {
      name: 'Order Violation',
      description: 'Operations expected to run in specific order',
      matcher: (a1, a2, ctx) => {
        return ctx?.hasOrderConstraint && !ctx?.orderEnforced;
      },
      severity: 'high',
      category: 'ordering',
      mitigationStrategies: [
        'Synchronization primitives',
        'Happens-before relationships',
        'Barrier synchronization'
      ]
    }, 'ordering');

    // Unknown/Other
    this.register('OTHER', {
      name: 'Unknown Race',
      description: 'Race condition of unknown type',
      matcher: () => true, // Matches everything as fallback
      severity: 'low',
      category: 'general',
      mitigationStrategies: [
        'Code review',
        'Static analysis tools',
        'Dynamic race detectors'
      ]
    }, 'general');
  }
}

// Create default registry instance
export const defaultRegistry = new PatternRegistry();

export default PatternRegistry;
