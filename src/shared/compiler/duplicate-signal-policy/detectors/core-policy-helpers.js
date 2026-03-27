import { normalizeFilePath } from '../../path-normalization.js';
import {
  LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX,
  LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX,
  LOW_SIGNAL_DATA_ACCESS_FINGERPRINTS,
  DATA_ACCESS_PATH_MARKERS,
  DATA_ACCESS_NAME_PREFIXES,
  GUARD_UTILITY_PATH_MARKERS,
  LOW_SIGNAL_GUARD_UTILITY_FINGERPRINTS,
  LOW_SIGNAL_GUARD_UTILITY_NAME_PREFIXES,
  UTILITY_HELPER_PATTERNS,
  STRUCTURAL_GUARD_PATH_MARKERS,
  DUPLICATE_SIGNAL_POLICY_FILE_MARKER
} from '../constants/index.js';
import { normalizeDuplicateSignalInputs } from '../transformers.js';
import { isCanonicalMcpToolRouter } from './subsystems.js';

export function isCanonicalDuplicateSignalPolicyFile(filePath) {
  const normalizedPath = normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase();
  return normalizedPath.endsWith(DUPLICATE_SIGNAL_POLICY_FILE_MARKER);
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

export function isLowSignalGuardStructuralHelper(filePath, atomName) {
  const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(filePath, atomName, '');

  const isGuardPath = STRUCTURAL_GUARD_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
  if (!isGuardPath) return false;

  return /^detect[a-z0-9]+risk$/i.test(normalizedName) ||
    /^load[a-z0-9]+(rows|atoms)$/i.test(normalizedName);
}

export function isCompatibilityWrapper(filePath, atomName, semanticFingerprint) {
  const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(
    filePath,
    atomName,
    semanticFingerprint
  );

  const isUtilityHelperPath = normalizedPath.includes('/extractors/') &&
    !normalizedPath.includes('/utils/');

  const isHelperName = UTILITY_HELPER_PATTERNS.some((pattern) => pattern.test(normalizedName));

  const isUtilityFingerprint = semanticFingerprint?.includes(':logic:core:') &&
    !semanticFingerprint.endsWith(':unknown');

  return isUtilityHelperPath && isHelperName && isUtilityFingerprint;
}

export function isFrameworkCoordinatorActionHook(filePath, atomName, semanticFingerprint) {
  return isCanonicalMcpToolRouter(filePath, atomName, semanticFingerprint);
}

export function isFrameworkTrackerHook(filePath, atomName, semanticFingerprint) {
  const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(
    filePath,
    atomName,
    semanticFingerprint
  );

  return normalizedPath.includes('/race-detector/trackers/') &&
    normalizedName === 'trackmolecule';
}

export function isInitializationLifecycleHook(filePath, atomName) {
  const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(filePath, atomName, '');

  return normalizedPath.includes('/mcp/core/initialization/') &&
    normalizedName === 'rollback';
}

export function isTypeContractStrategyHook(filePath, atomName) {
  const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(filePath, atomName, '');

  return normalizedPath.includes('/extractors/metadata/type-contracts/strategies/') &&
    normalizedName === 'calculateconfidence';
}

export function isFrameworkOrchestrationEntryPoint(semanticFingerprint) {
  const normalizedFingerprint = String(semanticFingerprint || '').trim();

  return normalizedFingerprint === 'process:orchestration:core:main' ||
    normalizedFingerprint === 'execute:orchestration:core:execute' ||
    normalizedFingerprint === 'run:orchestration:core:run' ||
    normalizedFingerprint === 'process:logic:core:score' ||
    normalizedFingerprint === 'validate:logic:core:validate' ||
    normalizedFingerprint.startsWith('test_framework:');
}

export function isLowSignalOrCompatibilityConceptualDuplicate(filePath, atomName, semanticFingerprint) {
  return isLowSignalGeneratedAtom(atomName, semanticFingerprint) ||
    isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) ||
    isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint) ||
    isCompatibilityWrapper(filePath, atomName, semanticFingerprint);
}

export function isCanonicalDuplicateSignalPolicyHelper(filePath, atomName) {
  if (!isCanonicalDuplicateSignalPolicyFile(filePath)) return false;

  const normalizedName = String(atomName || '').toLowerCase();
  return normalizedName.startsWith('is') || normalizedName.startsWith('should');
}
