/**
 * @fileoverview Repository Surface Constants
 *
 * Patterns for detecting repository contract surface helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/repository-surface
 */

// ============================================================================
// REPOSITORY CONTRACT SURFACE
// ============================================================================

export const REPOSITORY_SURFACE_PATH_MARKERS = [
    '/storage/repository/',
    '/query/queries/file-query/',
    '/mcp/tools/semantic/'
];

export const REPOSITORY_SURFACE_NAMES = new Set([
    'query',
    'getall',
    'findbyname',
    'findbyarchetype',
    'findbypurpose',
    'findsimilar',
    'updatevectors'
]);

export const REPOSITORY_SURFACE_FINGERPRINTS = new Set([
    'process:core:query',
    'get:core:all',
    'find:core:name',
    'find:core:archetype',
    'find:core:purpose',
    'find:core:similar',
    'update:core:vectors'
]);
