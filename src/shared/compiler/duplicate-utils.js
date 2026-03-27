/**
 * @fileoverview Canonical duplicate coordination utilities.
 *
 * Keeps duplicate coordination/persistence helpers separate from low-signal
 * policy classification so the compiler contract stays explicit.
 *
 * @module shared/compiler/duplicate-utils
 */

export { normalizeFilePath } from './path-normalization.js';
export { generateAlternativeNames } from './duplicate-utils-naming.js';
export { coordinateDuplicateFindings } from './duplicate-utils-coordination.js';
export { loadPreviousFindings } from './duplicate-utils-persistence.js';
export {
  buildDuplicateDebtHistory,
  buildDuplicateContext
} from './duplicate-debt.js';
export {
  isCanonicalDuplicateSignalPolicyFile,
  isLowSignalGeneratedAtom,
  isLowSignalConceptualFingerprint,
  isRepositoryContractSurface,
  isGuardUtilityConceptualFingerprint,
  isCanonicalMcpToolRouter,
  isRuntimePortProbeHelper,
  isMcpHttpProxyLifecycleHelper,
  isLegacyLlmBootstrapCompatibilityHelper,
  isStandaloneScriptEntryHelper,
  isLowSignalGuardStructuralHelper,
  shouldIgnoreConceptualDuplicateFinding,
  shouldIgnoreStructuralDuplicateFinding
} from './duplicate-signal-policy.js';
