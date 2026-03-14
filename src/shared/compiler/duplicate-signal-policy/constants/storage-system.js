/**
 * @fileoverview Storage & System Map Constants
 *
 * Patterns for detecting storage query and system map dependency helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/storage-system
 */

// ============================================================================
// STORAGE QUERY POLICY
// ============================================================================

export const STORAGE_QUERY_POLICY_FILE_MARKERS = [
    '/storage/repository/adapters/helpers/query-field-policy.js',
    '/storage/repository/adapters/helpers/query-filter-builder.js'
];

export const STORAGE_QUERY_POLICY_HELPER_NAMES = new Set([
    'validateatomsortfield',
    'isvalidatomvectorfield',
    'appendatomqueryfilters',
    'appendequalityfilter',
    'appendbooleanfilter',
    'appendboundfilter'
]);

export const STORAGE_QUERY_POLICY_FINGERPRINTS = new Set([
    'validate:core:field',
    'process:core:field',
    'process:core:query'
]);

// ============================================================================
// SYSTEM MAP DEPENDENCY HANDLER
// ============================================================================

export const SYSTEM_MAP_DEPENDENCY_HANDLER_FILE_MARKER = '/storage/repository/adapters/helpers/system-map/handlers/dependency-handler.js';

export const SYSTEM_MAP_DEPENDENCY_HANDLER_NAMES = new Set([
    'loadfiledependencies',
    'grouploadeddependencies',
    'normalizeloadeddependency',
    'parsejsonlist'
]);

export const SYSTEM_MAP_DEPENDENCY_HANDLER_FINGERPRINTS = new Set([
    'load:core:dependencies',
    'process:core:dependencies',
    'normalize:core:row',
    'parse:core:array'
]);
