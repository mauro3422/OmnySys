/**
 * @fileoverview Canonical duplicate signal policy helpers.
 *
 * Separates low-signal / contractual duplicate classification from duplicate
 * coordination so the compiler duplicate surface stays explicit.
 *
 * @module shared/compiler/duplicate-signal-policy
 */

import { normalizeFilePath } from './path-normalization.js';

const LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX = /^(anonymous(_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;
const LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX = /:(anonymous(?:_\d+)?|.*_callback|describe_arg\d+|it_arg\d+|on_arg\d+|then_callback|catch_callback|map_callback|filter_callback|some_callback|sort_callback|get_arg\d+)$/i;

const LOW_SIGNAL_DATA_ACCESS_FINGERPRINTS = new Set([
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

const DATA_ACCESS_PATH_MARKERS = [
    '/repository/',
    '/query/',
    '/storage/',
    '/guards/'
];

const DATA_ACCESS_NAME_PREFIXES = [
    'get',
    'load',
    'fetch',
    'list',
    'find',
    'select',
    'normalize'
];

const REPOSITORY_SURFACE_PATH_MARKERS = [
    '/storage/repository/',
    '/query/queries/file-query/',
    '/mcp/tools/semantic/'
];

const REPOSITORY_SURFACE_NAMES = new Set([
    'query',
    'getall',
    'findbyname',
    'findbyarchetype',
    'findbypurpose',
    'findsimilar',
    'updatevectors'
]);

const REPOSITORY_SURFACE_FINGERPRINTS = new Set([
    'process:core:query',
    'get:core:all',
    'find:core:name',
    'find:core:archetype',
    'find:core:purpose',
    'find:core:similar',
    'update:core:vectors'
]);

const GUARD_UTILITY_PATH_MARKERS = [
    '/file-watcher/guards/',
    '/shared/compiler/',
    '/logger',
    '/logging/'
];

const LOW_SIGNAL_GUARD_UTILITY_FINGERPRINTS = new Set([
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

const LOW_SIGNAL_GUARD_UTILITY_NAME_PREFIXES = [
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

const STRUCTURAL_GUARD_PATH_MARKERS = [
    '/file-watcher/guards/',
    '/shared/compiler/'
];

const DUPLICATE_SIGNAL_POLICY_FILE_MARKER = '/shared/compiler/duplicate-signal-policy.js';
const COMPILER_CONFORMANCE_FILE_REGEX = /\/shared\/compiler\/(?:[^/]+-conformance|policy-conformance)\.js$/;
const COMPILER_CONFORMANCE_HELPER_NAME_REGEX = /^(?:detect[A-Z]\w*ConformanceFromSource|imports[A-Z]\w+|uses[A-Z]\w+|looksLike[A-Z]\w+|references[A-Z]\w+|count[A-Z]\w+|is[A-Z]\w+|defines[A-Z]\w+)$/i;
const COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS = new Set([
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
    'process:core:path'
]);

const COMPILER_POLICY_ORCHESTRATION_FILE_MARKERS = [
    '/shared/compiler/duplicate-utils.js',
    '/shared/compiler/duplicate-debt.js',
    '/shared/compiler/duplicate-remediation.js',
    '/shared/compiler/compiler-diagnostics-snapshot.js',
    '/shared/compiler/compiler-contract-layer.js'
];

const STORAGE_QUERY_POLICY_FILE_MARKERS = [
    '/storage/repository/adapters/helpers/query-field-policy.js',
    '/storage/repository/adapters/helpers/query-filter-builder.js'
];

const STORAGE_QUERY_POLICY_HELPER_NAMES = new Set([
    'validateatomsortfield',
    'isvalidatomvectorfield',
    'appendatomqueryfilters',
    'appendequalityfilter',
    'appendbooleanfilter',
    'appendboundfilter'
]);

const STORAGE_QUERY_POLICY_FINGERPRINTS = new Set([
    'validate:core:field',
    'process:core:field',
    'process:core:query'
]);

const COMPILER_POLICY_ORCHESTRATION_NAME_REGEX = /^(?:coordinate[A-Z]\w+|build[A-Z]\w*Plan|build[A-Z]\w*Details|resolve[A-Z]\w*Priority)$/i;

const COMPILER_POLICY_ORCHESTRATION_FINGERPRINTS = new Set([
    'process:core:findings',
    'build:core:plan',
    'build:core:details',
    'build:core:context',
    'process:core:summary'
]);

const INTEGRITY_ANALYSIS_FILE_MARKER = '/shared/compiler/integrity-analysis.js';
const INTEGRITY_ANALYSIS_HELPER_NAMES = new Set([
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

const INTEGRITY_ANALYSIS_FINGERPRINTS = new Set([
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

const CANONICAL_GUIDANCE_FILE_MARKERS = [
    '/shared/compiler/canonical-reuse-guidance.js',
    '/shared/compiler/session-restart-lifecycle.js'
];

const CANONICAL_GUIDANCE_HELPER_NAMES = new Set([
    'createimporthint',
    'buildcanonicalreuseguidance',
    'buildcompilerreadinessstatus',
    'buildrestartlifecycleguidance'
]);

const CANONICAL_GUIDANCE_FINGERPRINTS = new Set([
    'create:core:hint',
    'build:core:guidance',
    'build:core:status'
]);

const RUNTIME_PORT_PROBE_FILE_MARKER = '/shared/utils/port-probe.js';
const RUNTIME_PORT_PROBE_NAMES = new Set([
    'isportbound',
    'isportacceptingconnections'
]);
const RUNTIME_PORT_PROBE_FINGERPRINTS = new Set([
    'process:core:connections',
    'process:core:port'
]);

const MCP_HTTP_PROXY_FILE_MARKER = '/layer-c-memory/mcp-http-proxy.js';
const MCP_HTTP_PROXY_LIFECYCLE_NAMES = new Set([
    'log',
    'clearrespawntimer',
    'schedulerespawn',
    'detecthealthydaemon',
    'waitforportrelease',
    'spawnworker',
    'shutdown'
]);
const MCP_HTTP_PROXY_LIFECYCLE_FINGERPRINTS = new Set([
    'process:core:shutdown',
    'process:core:worker',
    'process:core:timer',
    'process:core:release',
    'process:core:log'
]);

const LEGACY_LLM_BOOTSTRAP_FILE_MARKER = '/cli/utils/llm.js';
const LEGACY_LLM_BOOTSTRAP_NAMES = new Set([
    'ensurellmavailable',
    'isbrainserverstarting'
]);
const LEGACY_LLM_BOOTSTRAP_FINGERPRINTS = new Set([
    'process:core:available',
    'process:core:starting'
]);

const STANDALONE_SCRIPT_FILE_REGEX = /(?:^|\/)(?:scripts\/.+|install|run-layer-a)\.js$/;
const STANDALONE_SCRIPT_HELPER_NAMES = new Set([
    'main',
    'buildissue',
    'getscalar',
    'extractfunctionblock',
    'extractlatestreleaseversion',
    'readtext'
]);
const STANDALONE_SCRIPT_HELPER_FINGERPRINTS = new Set([
    'process:core:main',
    'build:core:issue'
]);

function normalizeDuplicateSignalInputs(filePath, atomName, semanticFingerprint) {
    return {
        normalizedPath: normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase(),
        normalizedName: String(atomName || '').toLowerCase(),
        fingerprint: String(semanticFingerprint || '').toLowerCase()
    };
}

function matchesPolicyPath(normalizedPath, pathMatchers = [], mode = 'includes') {
    return pathMatchers.some((marker) => (
        mode === 'endsWith' ? normalizedPath.endsWith(marker) : normalizedPath.includes(marker)
    ));
}

function matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, options = {}) {
    const {
        pathMatchers = [],
        pathMode = 'includes',
        names = null,
        nameRegex = null,
        fingerprints = null,
        extraFingerprintMatchers = []
    } = options;
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    if (pathMatchers.length > 0 && !matchesPolicyPath(normalizedPath, pathMatchers, pathMode)) {
        return false;
    }

    const hasNameMatch = names ? names.has(normalizedName) : nameRegex?.test(normalizedName);
    if (!hasNameMatch) return false;
    if (!fingerprint) return true;
    if (fingerprints?.has(fingerprint)) return true;

    return extraFingerprintMatchers.some((matcher) => matcher(normalizedName, fingerprint));
}

export function isCanonicalDuplicateSignalPolicyFile(filePath) {
    const normalizedPath = normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase();
    return normalizedPath.endsWith(DUPLICATE_SIGNAL_POLICY_FILE_MARKER);
}

function isCanonicalDuplicateSignalPolicyHelper(filePath, atomName) {
    if (!isCanonicalDuplicateSignalPolicyFile(filePath)) return false;

    const normalizedName = String(atomName || '').toLowerCase();
    return normalizedName.startsWith('is') || normalizedName.startsWith('should');
}

export function isLowSignalGeneratedAtom(atomName, semanticFingerprint) {
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    return LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX.test(normalizedName) ||
        LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX.test(fingerprint);
}

export function isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isDataAccessPath = DATA_ACCESS_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    const isDataAccessName = DATA_ACCESS_NAME_PREFIXES.some((prefix) => normalizedName.startsWith(prefix));

    return isDataAccessPath && isDataAccessName && LOW_SIGNAL_DATA_ACCESS_FINGERPRINTS.has(fingerprint);
}

export function isRepositoryContractSurface(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isRepositoryPath = REPOSITORY_SURFACE_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    if (!isRepositoryPath) return false;

    return REPOSITORY_SURFACE_NAMES.has(normalizedName) ||
        REPOSITORY_SURFACE_FINGERPRINTS.has(fingerprint);
}

export function isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isGuardUtilityPath = GUARD_UTILITY_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    const isGuardUtilityName = LOW_SIGNAL_GUARD_UTILITY_NAME_PREFIXES.some((prefix) => normalizedName.startsWith(prefix));

    return isGuardUtilityPath &&
        isGuardUtilityName &&
        LOW_SIGNAL_GUARD_UTILITY_FINGERPRINTS.has(fingerprint);
}

export function isCanonicalMcpToolRouter(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isMcpToolPath = normalizedPath.includes('/layer-c-memory/mcp/tools/') ||
        normalizedPath.includes('/layer-c-memory/mcp/core/shared/base-tools/');

    return isMcpToolPath &&
        normalizedName === 'performaction' &&
        fingerprint === 'process:core:action';
}

export function isCompilerConformancePolicyHelper(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    if (!COMPILER_CONFORMANCE_FILE_REGEX.test(normalizedPath)) return false;

    if (!COMPILER_CONFORMANCE_HELPER_NAME_REGEX.test(normalizedName)) return false;
    if (!fingerprint) return true;

    return COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS.has(fingerprint);
}

export function isCompilerPolicyOrchestrationHelper(filePath, atomName, semanticFingerprint) {
    const { normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: COMPILER_POLICY_ORCHESTRATION_FILE_MARKERS,
        pathMode: 'endsWith',
        nameRegex: COMPILER_POLICY_ORCHESTRATION_NAME_REGEX,
        fingerprints: COMPILER_POLICY_ORCHESTRATION_FINGERPRINTS,
        extraFingerprintMatchers: [
            () => !fingerprint && COMPILER_POLICY_ORCHESTRATION_NAME_REGEX.test(normalizedName)
        ]
    });
}

export function isStorageQueryPolicyHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: STORAGE_QUERY_POLICY_FILE_MARKERS,
        names: STORAGE_QUERY_POLICY_HELPER_NAMES,
        fingerprints: STORAGE_QUERY_POLICY_FINGERPRINTS
    });
}

export function isIntegrityAnalysisCanonicalHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [INTEGRITY_ANALYSIS_FILE_MARKER],
        pathMode: 'endsWith',
        names: INTEGRITY_ANALYSIS_HELPER_NAMES,
        fingerprints: INTEGRITY_ANALYSIS_FINGERPRINTS
    });
}

export function isRuntimePortProbeHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [RUNTIME_PORT_PROBE_FILE_MARKER],
        pathMode: 'endsWith',
        names: RUNTIME_PORT_PROBE_NAMES,
        fingerprints: RUNTIME_PORT_PROBE_FINGERPRINTS
    });
}

export function isCanonicalGuidanceHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: CANONICAL_GUIDANCE_FILE_MARKERS,
        pathMode: 'endsWith',
        names: CANONICAL_GUIDANCE_HELPER_NAMES,
        fingerprints: CANONICAL_GUIDANCE_FINGERPRINTS
    });
}

export function isMcpHttpProxyLifecycleHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [MCP_HTTP_PROXY_FILE_MARKER],
        pathMode: 'endsWith',
        names: MCP_HTTP_PROXY_LIFECYCLE_NAMES,
        fingerprints: MCP_HTTP_PROXY_LIFECYCLE_FINGERPRINTS,
        extraFingerprintMatchers: [
            (normalizedName) => normalizedName === 'schedulerespawn' || normalizedName === 'detecthealthydaemon'
        ]
    });
}

export function isLegacyLlmBootstrapCompatibilityHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [LEGACY_LLM_BOOTSTRAP_FILE_MARKER],
        pathMode: 'endsWith',
        names: LEGACY_LLM_BOOTSTRAP_NAMES,
        fingerprints: LEGACY_LLM_BOOTSTRAP_FINGERPRINTS
    });
}

export function isStandaloneScriptEntryHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [],
        names: STANDALONE_SCRIPT_HELPER_NAMES,
        fingerprints: STANDALONE_SCRIPT_HELPER_FINGERPRINTS,
        extraFingerprintMatchers: [
            (normalizedName) => (
                STANDALONE_SCRIPT_FILE_REGEX.test(normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase()) &&
                (normalizedName === 'getscalar' ||
                    normalizedName === 'extractfunctionblock' ||
                    normalizedName === 'extractlatestreleaseversion' ||
                    normalizedName === 'readtext')
            )
        ]
    }) && STANDALONE_SCRIPT_FILE_REGEX.test(
        normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase()
    );
}

export function isLowSignalGuardStructuralHelper(filePath, atomName) {
    const normalizedPath = normalizeFilePath(filePath).toLowerCase();
    const normalizedName = String(atomName || '').toLowerCase();

    const isGuardPath = STRUCTURAL_GUARD_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    if (!isGuardPath) return false;

    return /^detect[a-z0-9]+risk$/i.test(normalizedName) ||
        /^load[a-z0-9]+(rows|atoms)$/i.test(normalizedName);
}

function matchesConceptualIgnorePolicy(filePath, atomName, semanticFingerprint) {
    const checks = [
        () => isCanonicalDuplicateSignalPolicyHelper(filePath, atomName),
        () => isCanonicalGuidanceHelper(filePath, atomName, semanticFingerprint),
        () => isStorageQueryPolicyHelper(filePath, atomName, semanticFingerprint),
        () => isIntegrityAnalysisCanonicalHelper(filePath, atomName, semanticFingerprint),
        () => isRuntimePortProbeHelper(filePath, atomName, semanticFingerprint),
        () => isMcpHttpProxyLifecycleHelper(filePath, atomName, semanticFingerprint),
        () => isLegacyLlmBootstrapCompatibilityHelper(filePath, atomName, semanticFingerprint),
        () => isStandaloneScriptEntryHelper(filePath, atomName, semanticFingerprint),
        () => isCompilerPolicyOrchestrationHelper(filePath, atomName, semanticFingerprint),
        () => isLowSignalGeneratedAtom(atomName, semanticFingerprint),
        () => isCompilerConformancePolicyHelper(filePath, atomName, semanticFingerprint),
        () => isCanonicalMcpToolRouter(filePath, atomName, semanticFingerprint),
        () => isRepositoryContractSurface(filePath, atomName, semanticFingerprint),
        () => isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint),
        () => isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint)
    ];

    return checks.some((check) => check());
}

function matchesStructuralIgnorePolicy(filePath, atomName) {
    const checks = [
        () => isCanonicalDuplicateSignalPolicyHelper(filePath, atomName),
        () => isCanonicalGuidanceHelper(filePath, atomName, null),
        () => isStorageQueryPolicyHelper(filePath, atomName, null),
        () => isIntegrityAnalysisCanonicalHelper(filePath, atomName, null),
        () => isRuntimePortProbeHelper(filePath, atomName, null),
        () => isMcpHttpProxyLifecycleHelper(filePath, atomName, null),
        () => isLegacyLlmBootstrapCompatibilityHelper(filePath, atomName, null),
        () => isStandaloneScriptEntryHelper(filePath, atomName, null),
        () => isCompilerPolicyOrchestrationHelper(filePath, atomName, null),
        () => isRepositoryContractSurface(filePath, atomName, null),
        () => isCompilerConformancePolicyHelper(filePath, atomName, null),
        () => isLowSignalGuardStructuralHelper(filePath, atomName)
    ];

    return checks.some((check) => check());
}

export function shouldIgnoreConceptualDuplicateFinding(filePath, atomName, semanticFingerprint) {
    return matchesConceptualIgnorePolicy(filePath, atomName, semanticFingerprint);
}

export function shouldIgnoreStructuralDuplicateFinding(filePath, atomName) {
    return matchesStructuralIgnorePolicy(filePath, atomName);
}
