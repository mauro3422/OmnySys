/**
 * @fileoverview Subsystem Detectors
 *
 * Detector functions organized by subsystem (repository, storage, compiler, etc.)
 *
 * @module shared/compiler/duplicate-signal-policy/detectors/subsystems
 */

import { normalizeFilePath } from '../../path-normalization.js';
import {
    // Repository surface
    REPOSITORY_SURFACE_PATH_MARKERS,
    REPOSITORY_SURFACE_NAMES,
    REPOSITORY_SURFACE_FINGERPRINTS,
    // Storage & system map
    STORAGE_QUERY_POLICY_FILE_MARKERS,
    STORAGE_QUERY_POLICY_HELPER_NAMES,
    STORAGE_QUERY_POLICY_FINGERPRINTS,
    SYSTEM_MAP_DEPENDENCY_HANDLER_FILE_MARKER,
    SYSTEM_MAP_DEPENDENCY_HANDLER_NAMES,
    SYSTEM_MAP_DEPENDENCY_HANDLER_FINGERPRINTS,
    // Compiler conformance
    COMPILER_CONFORMANCE_FILE_REGEX,
    COMPILER_CONFORMANCE_HELPER_NAME_REGEX,
    COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS,
    POLICY_CONFORMANCE_FILE_MARKER,
    POLICY_CONFORMANCE_HELPER_NAMES,
    COMPILER_POLICY_ORCHESTRATION_FILE_MARKERS,
    COMPILER_POLICY_ORCHESTRATION_NAME_REGEX,
    COMPILER_POLICY_ORCHESTRATION_FINGERPRINTS,
    // Layer A & watcher
    LAYER_A_PIPELINE_CANONICAL_FILE_MARKERS,
    LAYER_A_PIPELINE_CANONICAL_HELPER_NAMES,
    LAYER_A_PIPELINE_CANONICAL_FINGERPRINTS,
    WATCHER_ISSUE_CANONICAL_FILE_MARKERS,
    WATCHER_ISSUE_CANONICAL_HELPER_NAMES,
    WATCHER_ISSUE_CANONICAL_FINGERPRINTS,
    PIPELINE_HEALTH_CANONICAL_FILE_MARKER,
    PIPELINE_HEALTH_CANONICAL_NAMES,
    PIPELINE_HEALTH_CANONICAL_FINGERPRINTS,
    // Duplicate core
    DUPLICATE_STRUCTURAL_CORE_FILE_MARKER,
    DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES,
    DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS,
    DUPLICATE_CONCEPTUAL_CORE_FILE_MARKER,
    DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES,
    DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS,
    // Integrity & guidance
    INTEGRITY_ANALYSIS_FILE_MARKER,
    INTEGRITY_ANALYSIS_HELPER_NAMES,
    INTEGRITY_ANALYSIS_FINGERPRINTS,
    CANONICAL_GUIDANCE_FILE_MARKERS,
    CANONICAL_GUIDANCE_HELPER_NAMES,
    CANONICAL_GUIDANCE_FINGERPRINTS,
    // Runtime & MCP
    RUNTIME_PORT_PROBE_FILE_MARKER,
    RUNTIME_PORT_PROBE_NAMES,
    RUNTIME_PORT_PROBE_FINGERPRINTS,
    MCP_HTTP_PROXY_FILE_MARKER,
    MCP_HTTP_PROXY_LIFECYCLE_NAMES,
    MCP_HTTP_PROXY_LIFECYCLE_FINGERPRINTS,
    // Legacy
    LEGACY_LLM_BOOTSTRAP_FILE_MARKER,
    LEGACY_LLM_BOOTSTRAP_NAMES,
    LEGACY_LLM_BOOTSTRAP_FINGERPRINTS,
    LEGACY_TUNNEL_VISION_COMPATIBILITY_FILE_MARKERS,
    LEGACY_TUNNEL_VISION_COMPATIBILITY_NAMES,
    LEGACY_TUNNEL_VISION_COMPATIBILITY_FINGERPRINTS,
    STANDALONE_SCRIPT_FILE_REGEX,
    STANDALONE_SCRIPT_HELPER_NAMES,
    STANDALONE_SCRIPT_HELPER_FINGERPRINTS,
    ORCHESTRATION_BOUNDARY_PATH_MARKERS,
    ORCHESTRATION_LIFECYCLE_NAMES,
    ORCHESTRATION_LIFECYCLE_FINGERPRINTS
} from '../constants/index.js';

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

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

// ============================================================================
// REPOSITORY & STORAGE DETECTORS
// ============================================================================

/**
 * Detects repository contract surface helpers.
 */
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

/**
 * Detects storage query policy helpers.
 */
export function isStorageQueryPolicyHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: STORAGE_QUERY_POLICY_FILE_MARKERS,
        names: STORAGE_QUERY_POLICY_HELPER_NAMES,
        fingerprints: STORAGE_QUERY_POLICY_FINGERPRINTS
    });
}

/**
 * Detects system map dependency persistence helpers.
 */
export function isSystemMapDependencyPersistenceHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [SYSTEM_MAP_DEPENDENCY_HANDLER_FILE_MARKER],
        pathMode: 'endsWith',
        names: SYSTEM_MAP_DEPENDENCY_HANDLER_NAMES,
        fingerprints: SYSTEM_MAP_DEPENDENCY_HANDLER_FINGERPRINTS
    });
}

// ============================================================================
// COMPILER & POLICY DETECTORS
// ============================================================================

/**
 * Detects compiler conformance policy helpers.
 */
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

/**
 * Detects policy conformance canonical helpers.
 */
export function isPolicyConformanceCanonicalHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [POLICY_CONFORMANCE_FILE_MARKER],
        pathMode: 'endsWith',
        names: POLICY_CONFORMANCE_HELPER_NAMES,
        fingerprints: COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS
    });
}

/**
 * Detects compiler policy orchestration helpers.
 */
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

// ============================================================================
// PIPELINE & WATCHER DETECTORS
// ============================================================================

/**
 * Detects Layer A pipeline canonical helpers.
 */
export function isLayerAPipelineCanonicalHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: LAYER_A_PIPELINE_CANONICAL_FILE_MARKERS,
        pathMode: 'endsWith',
        names: LAYER_A_PIPELINE_CANONICAL_HELPER_NAMES,
        fingerprints: LAYER_A_PIPELINE_CANONICAL_FINGERPRINTS
    });
}

/**
 * Detects watcher issue canonical helpers.
 */
export function isWatcherIssueCanonicalHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: WATCHER_ISSUE_CANONICAL_FILE_MARKERS,
        pathMode: 'endsWith',
        names: WATCHER_ISSUE_CANONICAL_HELPER_NAMES,
        fingerprints: WATCHER_ISSUE_CANONICAL_FINGERPRINTS
    });
}

/**
 * Detects canonical pipeline health helpers.
 */
export function isCanonicalPipelineHealthHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [PIPELINE_HEALTH_CANONICAL_FILE_MARKER],
        pathMode: 'endsWith',
        names: PIPELINE_HEALTH_CANONICAL_NAMES,
        fingerprints: PIPELINE_HEALTH_CANONICAL_FINGERPRINTS
    });
}

// ============================================================================
// DUPLICATE CORE DETECTORS
// ============================================================================

/**
 * Detects duplicate structural core helpers.
 */
export function isDuplicateStructuralCoreHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [DUPLICATE_STRUCTURAL_CORE_FILE_MARKER],
        pathMode: 'endsWith',
        names: DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES,
        fingerprints: DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS
    });
}

/**
 * Detects duplicate structural core reuse helpers.
 */
export function isDuplicateStructuralCoreReuseHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: ['/core/file-watcher/guards/'],
        names: DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES,
        fingerprints: DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS
    });
}

/**
 * Detects duplicate conceptual core helpers.
 */
export function isDuplicateConceptualCoreHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [DUPLICATE_CONCEPTUAL_CORE_FILE_MARKER],
        pathMode: 'endsWith',
        names: DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES,
        fingerprints: DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS
    });
}

/**
 * Detects duplicate conceptual core reuse helpers.
 */
export function isDuplicateConceptualCoreReuseHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: ['/core/file-watcher/guards/'],
        names: DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES,
        fingerprints: DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS
    });
}

// ============================================================================
// INTEGRITY & GUIDANCE DETECTORS
// ============================================================================

/**
 * Detects integrity analysis canonical helpers.
 */
export function isIntegrityAnalysisCanonicalHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [INTEGRITY_ANALYSIS_FILE_MARKER],
        pathMode: 'endsWith',
        names: INTEGRITY_ANALYSIS_HELPER_NAMES,
        fingerprints: INTEGRITY_ANALYSIS_FINGERPRINTS
    });
}

/**
 * Detects canonical guidance helpers.
 */
export function isCanonicalGuidanceHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: CANONICAL_GUIDANCE_FILE_MARKERS,
        pathMode: 'endsWith',
        names: CANONICAL_GUIDANCE_HELPER_NAMES,
        fingerprints: CANONICAL_GUIDANCE_FINGERPRINTS
    });
}

// ============================================================================
// RUNTIME & MCP DETECTORS
// ============================================================================

/**
 * Detects canonical MCP tool router functions.
 */
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
        (fingerprint === 'process:core:action' || fingerprint === 'process:logic:core:perform_action');
}

/**
 * Detects runtime port probe helpers.
 */
export function isRuntimePortProbeHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [RUNTIME_PORT_PROBE_FILE_MARKER],
        pathMode: 'endsWith',
        names: RUNTIME_PORT_PROBE_NAMES,
        fingerprints: RUNTIME_PORT_PROBE_FINGERPRINTS
    });
}

/**
 * Detects MCP HTTP proxy lifecycle helpers.
 */
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

// ============================================================================
// LEGACY & COMPATIBILITY DETECTORS
// ============================================================================

/**
 * Detects legacy LLM bootstrap compatibility helpers.
 */
export function isLegacyLlmBootstrapCompatibilityHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [LEGACY_LLM_BOOTSTRAP_FILE_MARKER],
        pathMode: 'endsWith',
        names: LEGACY_LLM_BOOTSTRAP_NAMES,
        fingerprints: LEGACY_LLM_BOOTSTRAP_FINGERPRINTS
    });
}

/**
 * Detects legacy tunnel vision compatibility helpers.
 */
export function isLegacyTunnelVisionCompatibilityHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: LEGACY_TUNNEL_VISION_COMPATIBILITY_FILE_MARKERS,
        pathMode: 'endsWith',
        names: LEGACY_TUNNEL_VISION_COMPATIBILITY_NAMES,
        fingerprints: LEGACY_TUNNEL_VISION_COMPATIBILITY_FINGERPRINTS
    });
}

/**
 * Detects standalone script entry helpers.
 */
export function isStandaloneScriptEntryHelper(filePath, atomName, semanticFingerprint) {
    const { normalizedPath } = normalizeDuplicateSignalInputs(filePath, '', '');
    
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: [],
        names: STANDALONE_SCRIPT_HELPER_NAMES,
        fingerprints: STANDALONE_SCRIPT_HELPER_FINGERPRINTS,
        extraFingerprintMatchers: [
            (normalizedName) => (
                STANDALONE_SCRIPT_FILE_REGEX.test(normalizedPath) &&
                (normalizedName === 'getscalar' ||
                    normalizedName === 'extractfunctionblock' ||
                    normalizedName === 'extractlatestreleaseversion' ||
                    normalizedName === 'readtext')
            )
        ]
    }) && STANDALONE_SCRIPT_FILE_REGEX.test(normalizedPath);
}

/**
 * Detects orchestration lifecycle boundary helpers.
 */
export function isOrchestrationLifecycleBoundaryHelper(filePath, atomName, semanticFingerprint) {
    return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
        pathMatchers: ORCHESTRATION_BOUNDARY_PATH_MARKERS,
        names: ORCHESTRATION_LIFECYCLE_NAMES,
        fingerprints: ORCHESTRATION_LIFECYCLE_FINGERPRINTS
    });
}
