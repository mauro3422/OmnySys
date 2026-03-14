/**
 * @fileoverview Duplicate Core Constants
 *
 * Patterns for detecting duplicate structural and conceptual core helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/duplicate-core
 */

// ============================================================================
// DUPLICATE SIGNAL POLICY
// ============================================================================

export const DUPLICATE_SIGNAL_POLICY_FILE_MARKER = '/shared/compiler/duplicate-signal-policy.js';

// ============================================================================
// DUPLICATE STRUCTURAL CORE
// ============================================================================

export const DUPLICATE_STRUCTURAL_CORE_FILE_MARKER = '/core/file-watcher/guards/duplicate-structural-core.js';

export const DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES = new Set([
    'loadstructurallocalatoms',
    'collectcandidatednas',
    'loadstructuralduplicaterows',
    'buildstructuralfindings',
    'clearstructuralduplicateissues'
]);

export const DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS = new Set([
    'load:core:atoms',
    'process:core:dnas',
    'load:core:rows',
    'build:core:findings',
    'process:core:issues'
]);

// ============================================================================
// DUPLICATE CONCEPTUAL CORE
// ============================================================================

export const DUPLICATE_CONCEPTUAL_CORE_FILE_MARKER = '/core/file-watcher/guards/duplicate-conceptual-core.js';

export const DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES = new Set([
    'clearconceptualduplicateissues',
    'loadconceptuallocalatoms',
    'shouldskipconceptualatom',
    'loadconceptualduplicaterows',
    'loadlocalstructuralhash',
    'buildconceptualfinding',
    'detectconceptualfindings'
]);

export const DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS = new Set([
    'process:core:issues',
    'load:core:atoms',
    'process:core:atom',
    'load:core:rows',
    'load:core:hash',
    'build:core:finding',
    'detect:core:findings'
]);

// ============================================================================
// STRUCTURAL GUARD
// ============================================================================

export const STRUCTURAL_GUARD_PATH_MARKERS = [
    '/file-watcher/guards/',
    '/shared/compiler/'
];
