/**
 * @fileoverview Core Policy Detectors
 *
 * Detector functions for duplicate signal policy classification.
 * Core policy detection (low-signal, generated code, wrappers).
 *
 * @module shared/compiler/duplicate-signal-policy/detectors/core-policy
 */

import {
  isCanonicalDuplicateSignalPolicyFile,
  isLowSignalGeneratedAtom,
  isLowSignalConceptualFingerprint,
  isGuardUtilityConceptualFingerprint,
  isLowSignalGuardStructuralHelper,
  isCompatibilityWrapper,
  isFrameworkCoordinatorActionHook,
  isFrameworkTrackerHook,
  isInitializationLifecycleHook,
  isTypeContractStrategyHook,
  isFrameworkOrchestrationEntryPoint,
  isLowSignalOrCompatibilityConceptualDuplicate,
  isCanonicalDuplicateSignalPolicyHelper
} from './core-policy-helpers.js';
import { classifyUtilityHelperDuplicate } from './utility-helper-classification.js';

// Export for backward compatibility
export {
  isCanonicalDuplicateSignalPolicyFile,
  isLowSignalGeneratedAtom,
  isLowSignalConceptualFingerprint,
  isGuardUtilityConceptualFingerprint,
  isLowSignalGuardStructuralHelper,
  isCompatibilityWrapper,
  isFrameworkCoordinatorActionHook,
  isFrameworkTrackerHook,
  isInitializationLifecycleHook,
  isTypeContractStrategyHook,
  isFrameworkOrchestrationEntryPoint,
  isLowSignalOrCompatibilityConceptualDuplicate,
  classifyUtilityHelperDuplicate,
  isCanonicalDuplicateSignalPolicyHelper
};

export function shouldIgnoreConceptualDuplicateFinding(filePath, atomName, semanticFingerprint) {
  if (isCanonicalDuplicateSignalPolicyFile(filePath)) {
    return true;
  }

  if (isFrameworkCoordinatorActionHook(filePath, atomName, semanticFingerprint)) {
    return true;
  }

  if (isFrameworkTrackerHook(filePath, atomName, semanticFingerprint)) {
    return true;
  }

  if (
    isInitializationLifecycleHook(filePath, atomName) ||
    isTypeContractStrategyHook(filePath, atomName)
  ) {
    return true;
  }

  if (isFrameworkOrchestrationEntryPoint(semanticFingerprint)) {
    return true;
  }

  if (isLowSignalOrCompatibilityConceptualDuplicate(filePath, atomName, semanticFingerprint)) {
    return true;
  }

  return false;
}

export function shouldIgnoreStructuralDuplicateFinding(filePath, atomName) {
  if (isCanonicalDuplicateSignalPolicyFile(filePath)) {
    return true;
  }

  if (isLowSignalGuardStructuralHelper(filePath, atomName)) {
    return true;
  }

  if (isLowSignalGeneratedAtom(atomName, '')) {
    return true;
  }

  return false;
}
