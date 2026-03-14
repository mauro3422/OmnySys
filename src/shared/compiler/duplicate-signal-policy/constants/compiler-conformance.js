/**
 * @fileoverview Compiler Conformance Constants
 *
 * Patterns for detecting compiler conformance policy helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/compiler-conformance
 */

// ============================================================================
// COMPILER CONFORMANCE
// ============================================================================

export const COMPILER_CONFORMANCE_FILE_REGEX = /\/shared\/compiler\/(?:[^/]+-conformance|policy-conformance)\.js$/;

export const COMPILER_CONFORMANCE_HELPER_NAME_REGEX = /^(?:detect[A-Z]\w*ConformanceFromSource|imports[A-Z]\w+|uses[A-Z]\w+|looksLike[A-Z]\w+|references[A-Z]\w+|count[A-Z]\w+|is[A-Z]\w+|defines[A-Z]\w+)$/i;

export const COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS = new Set([
    'detect:core:source',
    'process:core:api',
    'process:core:scan',
    'process:core:heuristic',
    'process:core:helper',
    'process:core:import',
    'process:core:layer',
    'process:core:signals',
    'process:core:keys',
    'process:core:only',
    'process:core:path',
    'process:core:finding',
    'process:core:ownership',
    'process:core:bypass',
    'process:core:drift'
]);

// ============================================================================
// POLICY CONFORMANCE
// ============================================================================

export const POLICY_CONFORMANCE_FILE_MARKER = '/shared/compiler/policy-conformance.js';

export const POLICY_CONFORMANCE_HELPER_NAMES = new Set([
    'maybefinding',
    'buildpolicyimportmap',
    'collectmanualreusefindings',
    'collectmanualdriftfindings',
    'collectmanualpolicyfindings',
    'collectconformancefindings',
    'buildcompilerpolicyissuesummary',
    'summarizecompilerpolicydrift'
]);

// ============================================================================
// COMPILER POLICY ORCHESTRATION
// ============================================================================

export const COMPILER_POLICY_ORCHESTRATION_FILE_MARKERS = [
    '/shared/compiler/duplicate-utils.js',
    '/shared/compiler/duplicate-debt.js',
    '/shared/compiler/duplicate-remediation.js',
    '/shared/compiler/compiler-diagnostics-snapshot.js',
    '/shared/compiler/compiler-contract-layer.js'
];

export const COMPILER_POLICY_ORCHESTRATION_NAME_REGEX = /^(?:coordinate[A-Z]\w+|build[A-Z]\w*Plan|build[A-Z]\w*Details|resolve[A-Z]\w*Priority)$/i;

export const COMPILER_POLICY_ORCHESTRATION_FINGERPRINTS = new Set([
    'process:core:findings',
    'build:core:plan',
    'build:core:details',
    'build:core:context',
    'process:core:summary'
]);
