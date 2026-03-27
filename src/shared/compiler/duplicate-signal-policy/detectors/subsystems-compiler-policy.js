import { normalizeDuplicateSignalInputs, matchesNamedPolicySurface } from '../transformers.js';
import {
  COMPILER_CONFORMANCE_FILE_REGEX,
  COMPILER_CONFORMANCE_HELPER_NAME_REGEX,
  COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS,
  POLICY_CONFORMANCE_FILE_MARKER,
  POLICY_CONFORMANCE_HELPER_NAMES,
  COMPILER_POLICY_ORCHESTRATION_FILE_MARKERS,
  COMPILER_POLICY_ORCHESTRATION_NAME_REGEX,
  COMPILER_POLICY_ORCHESTRATION_FINGERPRINTS
} from '../constants/index.js';

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

export function isPolicyConformanceCanonicalHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [POLICY_CONFORMANCE_FILE_MARKER],
    pathMode: 'endsWith',
    names: POLICY_CONFORMANCE_HELPER_NAMES,
    fingerprints: COMPILER_CONFORMANCE_LOW_SIGNAL_FINGERPRINTS
  });
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
