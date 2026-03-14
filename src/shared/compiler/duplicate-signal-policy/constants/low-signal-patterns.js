/**
 * @fileoverview Low Signal Pattern Constants
 *
 * Patterns for detecting low-signal / generated code that should be filtered
 * from duplicate detection.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/low-signal-patterns
 */

// ============================================================================
// GENERATED ATOM NAMES (anonymous, callbacks, test args)
// ============================================================================

export const LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;

export const LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX = /:(anonymous(?:_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;

// ============================================================================
// DATA ACCESS PATTERNS (repository/query operations)
// ============================================================================

export const LOW_SIGNAL_DATA_ACCESS_FINGERPRINTS = new Set([
    'get:core:atoms',
    'get:core:relations',
    'get:core:imports',
    'get:core:context',
    'get:core:count',
    'get:core:rows',
    'get:core:issue',
    'get:core:issues',
    'load:core:rows',
    'load:core:issue',
    'load:core:issues',
    'load:core:connections',
    'normalize:core:message'
]);

export const DATA_ACCESS_PATH_MARKERS = [
    '/repository/',
    '/query/',
    '/storage/',
    '/guards/'
];

export const DATA_ACCESS_NAME_PREFIXES = [
    'get',
    'load',
    'fetch',
    'list',
    'find',
    'select',
    'normalize'
];

// ============================================================================
// GUARD UTILITY PATTERNS
// ============================================================================

export const LOW_SIGNAL_GUARD_UTILITY_FINGERPRINTS = new Set([
    'detect:core:risk',
    'load:core:atoms',
    'load:core:rows',
    'process:core:log',
    'generate:core:recommendations',
    'build:core:context',
    'process:core:findings',
    'process:core:finding',
    'run:core:guard'
]);

export const LOW_SIGNAL_GUARD_UTILITY_NAME_PREFIXES = [
    'detect',
    'debug',
    'log',
    'generate',
    'build',
    'collect',
    'coordinate',
    'persist',
    'run'
];

export const GUARD_UTILITY_PATH_MARKERS = [
    '/file-watcher/guards/',
    '/shared/compiler/',
    '/logger',
    '/logging/'
];

// ============================================================================
// UTILITY HELPER PATTERNS (for compatibility wrappers)
// ============================================================================

export const UTILITY_HELPER_PATTERNS = [
    /^extract\w+$/i,
    /^parse\w+$/i,
    /^format\w+$/i,
    /^convert\w+$/i,
    /^normalize\w+$/i,
    /^validate\w+$/i,
    /^camelTo\w+$/i,
    /^remove\w+$/i,
    /^is\w+Helper$/i
];

export const UTILITY_HELPER_PATHS = [
    '/extractors/utils/',
    '/parser/extractors/utils',
    '/shared/compiler/',
    '/core/file-watcher/guards/guard-standards/'
];
