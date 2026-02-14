/**
 * @fileoverview builtin-patterns.js
 * 
 * Built-in race condition patterns for the PatternRegistry.
 * Includes patterns for data races, initialization races, event-driven races,
 * atomicity violations, and order violations.
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/builtin-patterns
 */

/**
 * @typedef {Object} RacePattern
 * @property {string} type - Pattern type code (e.g., 'RW', 'WW')
 * @property {string} name - Human-readable name
 * @property {string} description - Pattern description
 * @property {Function} matcher - Function to check if accesses match pattern
 * @property {string} severity - Default severity ('low' | 'medium' | 'high' | 'critical')
 * @property {Array<string>} mitigationStrategies - Suggested mitigation approaches
 * @property {string} [category] - Pattern category
 */

/**
 * Built-in race condition patterns
 * @type {Array<{type: string, pattern: RacePattern, category: string}>}
 */
export const BUILTIN_PATTERNS = [
  // Read-Write (RW) - Classic race condition
  {
    type: 'RW',
    pattern: {
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
    },
    category: 'data-race'
  },

  // Write-Write (WW) - Lost update
  {
    type: 'WW',
    pattern: {
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
    },
    category: 'data-race'
  },

  // Write-Read (WR) - Similar to RW
  {
    type: 'WR',
    pattern: {
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
    },
    category: 'data-race'
  },

  // Initialization Error (IE)
  {
    type: 'IE',
    pattern: {
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
    },
    category: 'initialization'
  },

  // Event Handler (EH)
  {
    type: 'EH',
    pattern: {
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
    },
    category: 'event-driven'
  },

  // Atomicity Violation (AV)
  {
    type: 'AV',
    pattern: {
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
    },
    category: 'atomicity'
  },

  // Order Violation (OV)
  {
    type: 'OV',
    pattern: {
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
    },
    category: 'ordering'
  },

  // Unknown/Other
  {
    type: 'OTHER',
    pattern: {
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
    },
    category: 'general'
  }
];

export default BUILTIN_PATTERNS;
