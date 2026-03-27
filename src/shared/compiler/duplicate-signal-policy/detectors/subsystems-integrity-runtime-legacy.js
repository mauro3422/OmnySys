import { normalizeDuplicateSignalInputs, matchesNamedPolicySurface } from '../transformers.js';
import {
  INTEGRITY_ANALYSIS_FILE_MARKER,
  INTEGRITY_ANALYSIS_HELPER_NAMES,
  INTEGRITY_ANALYSIS_FINGERPRINTS,
  CANONICAL_GUIDANCE_FILE_MARKERS,
  CANONICAL_GUIDANCE_HELPER_NAMES,
  CANONICAL_GUIDANCE_FINGERPRINTS,
  RUNTIME_PORT_PROBE_FILE_MARKER,
  RUNTIME_PORT_PROBE_NAMES,
  RUNTIME_PORT_PROBE_FINGERPRINTS,
  MCP_HTTP_PROXY_FILE_MARKER,
  MCP_HTTP_PROXY_LIFECYCLE_NAMES,
  MCP_HTTP_PROXY_LIFECYCLE_FINGERPRINTS,
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

export function isIntegrityAnalysisCanonicalHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [INTEGRITY_ANALYSIS_FILE_MARKER],
    pathMode: 'endsWith',
    names: INTEGRITY_ANALYSIS_HELPER_NAMES,
    fingerprints: INTEGRITY_ANALYSIS_FINGERPRINTS
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

export function isRuntimePortProbeHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [RUNTIME_PORT_PROBE_FILE_MARKER],
    pathMode: 'endsWith',
    names: RUNTIME_PORT_PROBE_NAMES,
    fingerprints: RUNTIME_PORT_PROBE_FINGERPRINTS
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

export function isLegacyTunnelVisionCompatibilityHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: LEGACY_TUNNEL_VISION_COMPATIBILITY_FILE_MARKERS,
    pathMode: 'endsWith',
    names: LEGACY_TUNNEL_VISION_COMPATIBILITY_NAMES,
    fingerprints: LEGACY_TUNNEL_VISION_COMPATIBILITY_FINGERPRINTS
  });
}

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

export function isOrchestrationLifecycleBoundaryHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: ORCHESTRATION_BOUNDARY_PATH_MARKERS,
    names: ORCHESTRATION_LIFECYCLE_NAMES,
    fingerprints: ORCHESTRATION_LIFECYCLE_FINGERPRINTS
  });
}
