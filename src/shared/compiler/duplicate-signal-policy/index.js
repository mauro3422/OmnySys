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

// Policy decision functions (explicit re-export for clarity)
export {
    shouldIgnoreConceptualDuplicateFinding,
    shouldIgnoreStructuralDuplicateFinding,
    classifyUtilityHelperDuplicate,
    isCanonicalDuplicateSignalPolicyFile
} from './detectors/core-policy/index.js';

// Utility functions (re-exported from canonical helpers for backward compatibility)
export {
    generateAlternativeNames,
} from '../duplicate-utils-naming.js';

export {
    buildDuplicateDebtHistory,
    buildDuplicateContext,
} from '../duplicate-debt/index.js';

export {
    loadPreviousFindings,
} from '../duplicate-utils-persistence.js';

export {
    coordinateDuplicateFindings
} from '../duplicate-utils-coordination.js';
