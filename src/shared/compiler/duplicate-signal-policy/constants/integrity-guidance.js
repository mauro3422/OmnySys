/**
 * @fileoverview Integrity & Guidance Constants
 *
 * Patterns for detecting integrity analysis and canonical guidance helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/integrity-guidance
 */

// ============================================================================
// INTEGRITY ANALYSIS
// ============================================================================

export const INTEGRITY_ANALYSIS_FILE_MARKER = '/shared/compiler/integrity-analysis.js';

export const INTEGRITY_ANALYSIS_HELPER_NAMES = new Set([
    'normalizeunusedinputname',
    'islikelyparsernoiseunusedinput',
    'getactionableunusedinputs',
    'getboundaryatomcontext',
    'hasboundarycontainername',
    'hasboundarycontainerpath',
    'hasboundarycontainerfingerprint',
    'hasorchestratorcontainerpath',
    'hasorchestratorcontainerfingerprint',
    'islikelytoolwrapperatom',
    'islikelyboundarycontaineratom',
    'hasasyncnamingmismatch'
]);

export const INTEGRITY_ANALYSIS_FINGERPRINTS = new Set([
    'normalize:core:name',
    'get:core:context',
    'process:core:name',
    'process:core:path',
    'process:core:fingerprint',
    'process:core:input',
    'get:core:inputs',
    'process:core:atom',
    'process:core:mismatch'
]);

// ============================================================================
// CANONICAL GUIDANCE
// ============================================================================

export const CANONICAL_GUIDANCE_FILE_MARKERS = [
    '/shared/compiler/canonical-reuse-guidance.js',
    '/shared/compiler/session-restart-lifecycle.js'
];

export const CANONICAL_GUIDANCE_HELPER_NAMES = new Set([
    'createimporthint',
    'buildcanonicalreuseguidance',
    'buildcompilerreadinessstatus',
    'buildrestartlifecycleguidance'
]);

export const CANONICAL_GUIDANCE_FINGERPRINTS = new Set([
    'create:core:hint',
    'build:core:guidance',
    'build:core:status'
]);

// ============================================================================
// PIPELINE HEALTH CANONICAL
// ============================================================================

export const PIPELINE_HEALTH_CANONICAL_FILE_MARKER = '/layer-c-memory/mcp/tools/handlers/pipeline-health-handler.js';

export const PIPELINE_HEALTH_CANONICAL_NAMES = new Set([
    'aggregatepipelinehealth',
    'loadexpectedpipelinetablecounts',
    'scancompilerpolicyhealth'
]);

export const PIPELINE_HEALTH_CANONICAL_FINGERPRINTS = new Set([
    'process:core:health',
    'load:core:counts',
    'scan:core:health'
]);
