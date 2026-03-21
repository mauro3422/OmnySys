/**
 * @fileoverview Canonical taxonomy for dead-code detection.
 *
 * @module shared/compiler/dead-code-taxonomy
 */

export const LOW_SIGNAL_PATTERNS = [
    /^anonymous(_\d+)?$/i,
    /^.*_callback$/i,
    /_arg\d+$/i,
    /^(then|catch|map|filter|some|reduce|find)_callback$/i
];

export const EXCLUDED_PURPOSES = new Set([
    'ENTRY_POINT',
    'WORKER_ENTRY',
    'SERVER_HANDLER',
    'EVENT_HANDLER',
    'TIMER_ASYNC',
    'NETWORK_HANDLER',
    'SCRIPT_MAIN',
    'ANALYSIS_SCRIPT',
    'TEST_HELPER',
    'FACTORY',
    'WRAPPER'
]);

export const EXCLUDED_FILE_PATTERNS = [
    /mcp-.*proxy/i,
    /mcp-.*server/i,
    /mcp-.*bridge/i,
    /error-guardian/i,
    /initialization\/steps/i
];

export const MANUAL_DEAD_CODE_PATTERNS = [
    /(callers_count|callees_count|called_by_json|calls_json)/,
    /(dead code|orphan|unused function|suspicious atoms|suspicious dead)/i
];

export const CANONICAL_DEAD_CODE_RESOURCES = [
    /getSuspiciousDeadCodeCount/,
    /getDeadCodePlausibilitySummary/,
    /getDeadCodeSqlPredicate/,
    /deadCodeSummary\.(flaggedDeadCode|suspiciousDeadCandidates|warning)/
];

export const SQLITE_LOW_SIGNAL_GLOBS = [
    "name NOT GLOB 'anonymous*'",
    "name NOT GLOB '*_callback'",
    "name NOT GLOB '*_arg*'",
    "name NOT GLOB 'then_callback'",
    "name NOT GLOB 'catch_callback'",
    "name NOT GLOB 'map_callback'",
    "name NOT GLOB 'filter_callback'",
    "name NOT GLOB 'some_callback'",
    "name NOT GLOB 'reduce_callback'",
    "name NOT GLOB 'find_callback'"
];
