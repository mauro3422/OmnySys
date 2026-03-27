import { matchesNamedPolicySurface } from '../transformers.js';
import {
  DUPLICATE_STRUCTURAL_CORE_FILE_MARKER,
  DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES,
  DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS,
  DUPLICATE_CONCEPTUAL_CORE_FILE_MARKER,
  DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES,
  DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS
} from '../constants/index.js';

export function isDuplicateStructuralCoreHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [DUPLICATE_STRUCTURAL_CORE_FILE_MARKER],
    pathMode: 'endsWith',
    names: DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES,
    fingerprints: DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS
  });
}

export function isDuplicateStructuralCoreReuseHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: ['/core/file-watcher/guards/'],
    names: DUPLICATE_STRUCTURAL_CORE_HELPER_NAMES,
    fingerprints: DUPLICATE_STRUCTURAL_CORE_FINGERPRINTS
  });
}

export function isDuplicateConceptualCoreHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: [DUPLICATE_CONCEPTUAL_CORE_FILE_MARKER],
    pathMode: 'endsWith',
    names: DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES,
    fingerprints: DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS
  });
}

export function isDuplicateConceptualCoreReuseHelper(filePath, atomName, semanticFingerprint) {
  return matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, {
    pathMatchers: ['/core/file-watcher/guards/'],
    names: DUPLICATE_CONCEPTUAL_CORE_HELPER_NAMES,
    fingerprints: DUPLICATE_CONCEPTUAL_CORE_FINGERPRINTS
  });
}
