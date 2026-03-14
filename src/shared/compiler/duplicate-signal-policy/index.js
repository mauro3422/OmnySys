/**
 * @fileoverview Duplicate Signal Policy - Coordinator
 *
 * Re-exports all policy helpers from modular structure.
 * Use this as the main entry point for duplicate signal policy detection.
 *
 * @module shared/compiler/duplicate-signal-policy
 */

// Constants (low-signal patterns)
export * from './constants/index.js';

// Transformers (normalization utilities)
export {
    normalizeDuplicateSignalInputs,
    matchesPolicyPath,
    matchesNamedPolicySurface
} from './transformers.js';

// Detectors (all is* functions)
export * from './detectors/index.js';
