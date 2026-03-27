import { normalizeDuplicateSignalInputs, matchesNamedPolicySurface } from '../transformers.js';
import {
  REPOSITORY_SURFACE_PATH_MARKERS,
  REPOSITORY_SURFACE_NAMES,
  REPOSITORY_SURFACE_FINGERPRINTS,
  STORAGE_QUERY_POLICY_FILE_MARKERS,
  STORAGE_QUERY_POLICY_HELPER_NAMES,
  STORAGE_QUERY_POLICY_FINGERPRINTS,
  SYSTEM_MAP_DEPENDENCY_HANDLER_FILE_MARKER,
  SYSTEM_MAP_DEPENDENCY_HANDLER_NAMES,
  SYSTEM_MAP_DEPENDENCY_HANDLER_FINGERPRINTS
} from '../constants/index.js';

export function isRepositoryContractSurface(filePath, atomName, semanticFingerprint) {
  const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
    filePath,
    atomName,
    semanticFingerprint
  );

  const isRepositoryPath = REPOSITORY_SURFACE_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
  if (!isRepositoryPath) return false;

  return REPOSITORY_SURFACE_NAMES.has(normalizedName) || REPOSITORY_SURFACE_FINGERPRINTS.has(fingerprint);
}

export function isStorageQueryPolicyHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: STORAGE_QUERY_POLICY_FILE_MARKERS,
    names: STORAGE_QUERY_POLICY_HELPER_NAMES,
    fingerprints: STORAGE_QUERY_POLICY_FINGERPRINTS
  });
}

export function isSystemMapDependencyPersistenceHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [SYSTEM_MAP_DEPENDENCY_HANDLER_FILE_MARKER],
    pathMode: 'endsWith',
    names: SYSTEM_MAP_DEPENDENCY_HANDLER_NAMES,
    fingerprints: SYSTEM_MAP_DEPENDENCY_HANDLER_FINGERPRINTS
  });
}
