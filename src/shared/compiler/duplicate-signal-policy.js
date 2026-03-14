/**
 * @fileoverview Duplicate Signal Policy - Backward Compatibility Coordinator
 *
 * This file maintains backward compatibility by re-exporting from the modular structure.
 * New code should import directly from './duplicate-signal-policy/index.js'
 *
 * @deprecated Use import from './duplicate-signal-policy/index.js' instead
 * @module shared/compiler/duplicate-signal-policy
 */

// Re-export everything from the modular structure
export * from './duplicate-signal-policy/index.js';

// TODO: Remove this file once all imports are updated to use the modular structure
