/**
 * @fileoverview Layer A & Watcher Constants
 *
 * Patterns for detecting Layer A pipeline and watcher issue canonical helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/layer-a-watcher
 */

// ============================================================================
// LAYER A PIPELINE CANONICAL
// ============================================================================

export const LAYER_A_PIPELINE_CANONICAL_FILE_MARKERS = [
    '/layer-a-static/pipeline/incremental-analysis-utils.js',
    '/layer-a-static/pipeline/file-summary-storage.js'
];

export const LAYER_A_PIPELINE_CANONICAL_HELPER_NAMES = new Set([
    'calculatecontenthash',
    'toprojectrelativepath',
    'savefilesummariesbatch'
]);

export const LAYER_A_PIPELINE_CANONICAL_FINGERPRINTS = new Set([
    'calculate:core:hash',
    'process:core:path',
    'save:core:batch'
]);

// ============================================================================
// WATCHER ISSUE CANONICAL
// ============================================================================

export const WATCHER_ISSUE_CANONICAL_FILE_MARKERS = [
    '/shared/compiler/watcher-issue-storage.js',
    '/shared/compiler/watcher-issue-reconciliation.js'
];

export const WATCHER_ISSUE_CANONICAL_HELPER_NAMES = new Set([
    'normalizewatcherissuefilepath',
    'collectreferencedatomids',
    'collectreferencedsymbols',
    'getmaxmtimerecursively',
    'getcachedruntimedependencymtime',
    'getcachedfilecontents',
    'getalertfilesnapshot',
    'isalertoutdatedbymissingsymbols',
    'isalertoutdatedbyruntimedependencies',
    'findorphanedwatcheralertids',
    'findoutdatedwatcheralertids',
    'normalizewatcheralertlifecyclefilter',
    'matcheswatcheralertlifecycle',
    'partitionwatcheralertsbylifecycle',
    'filterwatcheralertsbylifecycle',
    'getwatcherissuefamily',
    'getwatcherissueidentity',
    'findsupersededwatcheralertids'
]);

export const WATCHER_ISSUE_CANONICAL_FINGERPRINTS = new Set([
    'normalize:core:path',
    'process:core:atoms',
    'process:core:symbols',
    'get:core:mtime',
    'get:core:contents',
    'get:core:snapshot',
    'process:core:dependencies',
    'find:core:ids',
    'filter:core:lifecycle',
    'match:core:lifecycle',
    'partition:core:lifecycle',
    'get:core:family',
    'get:core:identity'
]);
