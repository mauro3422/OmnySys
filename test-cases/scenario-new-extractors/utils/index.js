/**
 * Utils Facade
 * Tests: facade archetype detector
 * Expected: Detected as facade (re-exports from 3+ internal modules)
 */

// Re-export from internal modules
export * from './string.js';
export * from './date.js';
export * from './math.js';

// Only aggregates, doesn't define much
