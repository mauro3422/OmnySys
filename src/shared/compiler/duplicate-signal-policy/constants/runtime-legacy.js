/**
 * @fileoverview Runtime & Legacy Constants
 *
 * Patterns for detecting runtime, MCP, and legacy compatibility helpers.
 *
 * @module shared/compiler/duplicate-signal-policy/constants/runtime-legacy
 */

// ============================================================================
// RUNTIME PORT PROBE
// ============================================================================

export const RUNTIME_PORT_PROBE_FILE_MARKER = '/shared/utils/port-probe.js';

export const RUNTIME_PORT_PROBE_NAMES = new Set([
    'isportbound',
    'isportacceptingconnections'
]);

export const RUNTIME_PORT_PROBE_FINGERPRINTS = new Set([
    'process:core:connections',
    'process:core:port'
]);

// ============================================================================
// MCP HTTP PROXY LIFECYCLE
// ============================================================================

export const MCP_HTTP_PROXY_FILE_MARKER = '/layer-c-memory/mcp-http-proxy.js';

export const MCP_HTTP_PROXY_LIFECYCLE_NAMES = new Set([
    'log',
    'clearrespawntimer',
    'schedulerespawn',
    'detecthealthydaemon',
    'waitforportrelease',
    'spawnworker',
    'shutdown'
]);

export const MCP_HTTP_PROXY_LIFECYCLE_FINGERPRINTS = new Set([
    'process:core:shutdown',
    'process:core:worker',
    'process:core:timer',
    'process:core:release',
    'process:core:log'
]);

// ============================================================================
// LEGACY LLM BOOTSTRAP
// ============================================================================

export const LEGACY_LLM_BOOTSTRAP_FILE_MARKER = '/cli/utils/llm.js';

export const LEGACY_LLM_BOOTSTRAP_NAMES = new Set([
    'ensurellmavailable',
    'isbrainserverstarting'
]);

export const LEGACY_LLM_BOOTSTRAP_FINGERPRINTS = new Set([
    'process:core:available',
    'process:core:starting'
]);

// ============================================================================
// LEGACY TUNNEL VISION COMPATIBILITY
// ============================================================================

export const LEGACY_TUNNEL_VISION_COMPATIBILITY_FILE_MARKERS = [
    '/core/tunnel-vision-logger/stats/calculator.js',
    '/core/tunnel-vision-logger/stats/analyzer.js'
];

export const LEGACY_TUNNEL_VISION_COMPATIBILITY_NAMES = new Set([
    'loadstats',
    'updatestats',
    'getstats',
    'analyzepatterns'
]);

export const LEGACY_TUNNEL_VISION_COMPATIBILITY_FINGERPRINTS = new Set([
    'load:core:stats',
    'update:core:stats',
    'get:core:stats',
    'analyze:core:patterns'
]);

// ============================================================================
// STANDALONE SCRIPT
// ============================================================================

export const STANDALONE_SCRIPT_FILE_REGEX = /(?:^|\/)(?:scripts\/.+|install|run-layer-a)\.js$/;

export const STANDALONE_SCRIPT_HELPER_NAMES = new Set([
    'main',
    'buildissue',
    'getscalar',
    'extractfunctionblock',
    'extractlatestreleaseversion',
    'readtext'
]);

export const STANDALONE_SCRIPT_HELPER_FINGERPRINTS = new Set([
    'process:core:main',
    'build:core:issue'
]);

// ============================================================================
// ORCHESTRATION BOUNDARY
// ============================================================================

export const ORCHESTRATION_BOUNDARY_PATH_MARKERS = [
    '/core/orchestrator/',
    '/core/unified-server/',
    '/mcp/core/',
    '/storage/repository/adapters/'
];

export const ORCHESTRATION_LIFECYCLE_NAMES = new Set([
    'start',
    'stop',
    'initialize',
    'close',
    'shutdown',
    'constructor'
]);

export const ORCHESTRATION_LIFECYCLE_FINGERPRINTS = new Set([
    'process:core:shutdown',
    'process:core:close',
    'process:core:constructor',
    'init:core:ialize'
]);
