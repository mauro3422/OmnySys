/**
 * @fileoverview Core Policy Detectors
 *
 * Detector functions for duplicate signal policy classification.
 * Core policy detection (low-signal, generated code, wrappers).
 *
 * @module shared/compiler/duplicate-signal-policy/detectors/core-policy
 */

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
    UTILITY_HELPER_PATHS,
    STRUCTURAL_GUARD_PATH_MARKERS,
    DUPLICATE_SIGNAL_POLICY_FILE_MARKER
} from '../constants/index.js';

import {
    normalizeDuplicateSignalInputs
} from '../transformers.js';
import { isCanonicalMcpToolRouter } from './subsystems.js';
export { classifyUtilityHelperDuplicate } from './utility-helper-classification.js';

// ============================================================================
// CORE POLICY DETECTORS
// ============================================================================

/**
 * Detects if file is the canonical duplicate signal policy file.
 */
export function isCanonicalDuplicateSignalPolicyFile(filePath) {
    const normalizedPath = normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase();
    return normalizedPath.endsWith(DUPLICATE_SIGNAL_POLICY_FILE_MARKER);
}

/**
 * Detects low-signal generated atom names (anonymous, callbacks, etc.)
 */
export function isLowSignalGeneratedAtom(atomName, semanticFingerprint) {
    const normalizedName = String(atomName || '').toLowerCase();
    const fingerprint = String(semanticFingerprint || '').toLowerCase();

    return LOW_SIGNAL_GENERATED_ATOM_NAME_REGEX.test(normalizedName) ||
        LOW_SIGNAL_GENERATED_FINGERPRINT_ENTITY_REGEX.test(fingerprint);
}

/**
 * Detects low-signal data access fingerprints in repository paths.
 */
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

/**
 * Detects guard utility conceptual fingerprints.
 */
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

/**
 * Detects low-signal guard structural helpers.
 */
export function isLowSignalGuardStructuralHelper(filePath, atomName) {
    const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(filePath, atomName, '');

    const isGuardPath = STRUCTURAL_GUARD_PATH_MARKERS.some((marker) => normalizedPath.includes(marker));
    if (!isGuardPath) return false;

    return /^detect[a-z0-9]+risk$/i.test(normalizedName) ||
        /^load[a-z0-9]+(rows|atoms)$/i.test(normalizedName);
}

/**
 * Detects if a function is a compatibility wrapper that delegates to a canonical helper.
 */
export function isCompatibilityWrapper(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    const isUtilityHelperPath = normalizedPath.includes('/extractors/') && 
                                 !normalizedPath.includes('/utils/');
    
    const isHelperName = UTILITY_HELPER_PATTERNS.some(pattern => pattern.test(normalizedName));
    
    const isUtilityFingerprint = semanticFingerprint?.includes(':logic:core:') &&
                                  !semanticFingerprint.endsWith(':unknown');

    return isUtilityHelperPath && isHelperName && isUtilityFingerprint;
}

/**
 * Detects framework coordinator hooks that intentionally share the same
 * `performAction` contract across the MCP tool hierarchy.
 */
export function isFrameworkCoordinatorActionHook(filePath, atomName, semanticFingerprint) {
    return isCanonicalMcpToolRouter(filePath, atomName, semanticFingerprint);
}

/**
 * Detects framework tracker hooks that intentionally share the same
 * `trackMolecule` contract across the race-detector tracker hierarchy.
 */
export function isFrameworkTrackerHook(filePath, atomName, semanticFingerprint) {
    const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    return normalizedPath.includes('/race-detector/trackers/') &&
        normalizedName === 'trackmolecule';
}

function isInitializationLifecycleHook(filePath, atomName) {
    const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        ''
    );

    return normalizedPath.includes('/mcp/core/initialization/') &&
        normalizedName === 'rollback';
}

function isTypeContractStrategyHook(filePath, atomName) {
    const { normalizedPath, normalizedName } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        ''
    );

    return normalizedPath.includes('/extractors/metadata/type-contracts/strategies/') &&
        normalizedName === 'calculateconfidence';
}

function isFrameworkOrchestrationEntryPoint(semanticFingerprint) {
    const normalizedFingerprint = String(semanticFingerprint || '').trim();

    return normalizedFingerprint === 'process:orchestration:core:main' ||
        normalizedFingerprint === 'execute:orchestration:core:execute' ||
        normalizedFingerprint === 'run:orchestration:core:run' ||
        normalizedFingerprint === 'process:logic:core:score' ||
        normalizedFingerprint === 'validate:logic:core:validate' ||
        normalizedFingerprint.startsWith('test_framework:');
}

function isLowSignalOrCompatibilityConceptualDuplicate(filePath, atomName, semanticFingerprint) {
    return isLowSignalGeneratedAtom(atomName, semanticFingerprint) ||
        isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint) ||
        isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint) ||
        isCompatibilityWrapper(filePath, atomName, semanticFingerprint);
}

/**
 * Internal helper for canonical duplicate signal policy detection.
 * @private
 */
function isCanonicalDuplicateSignalPolicyHelper(filePath, atomName) {
    if (!isCanonicalDuplicateSignalPolicyFile(filePath)) return false;

    const normalizedName = String(atomName || '').toLowerCase();
    return normalizedName.startsWith('is') || normalizedName.startsWith('should');
}

// Export for backward compatibility
export { isCanonicalDuplicateSignalPolicyHelper };

// ============================================================================
// POLICY DECISION FUNCTIONS
// ============================================================================

/**
 * Determines if a conceptual duplicate finding should be ignored based on policy.
 *
 * Conceptual duplicates are based on semantic fingerprints (same logic, different names).
 * This function checks if the finding matches any low-signal or policy-excluded pattern.
 *
 * @param {string} filePath - The file path of the atom
 * @param {string} atomName - The name of the atom
 * @param {string} semanticFingerprint - The semantic fingerprint of the atom
 * @returns {boolean} True if the finding should be ignored, false otherwise
 */
export function shouldIgnoreConceptualDuplicateFinding(filePath, atomName, semanticFingerprint) {
    // Ignore if it's the canonical duplicate signal policy file itself
    if (isCanonicalDuplicateSignalPolicyFile(filePath)) {
        return true;
    }

    // Ignore canonical framework coordinator hooks that intentionally share
    // the `performAction` contract across the MCP tool hierarchy.
    if (isFrameworkCoordinatorActionHook(filePath, atomName, semanticFingerprint)) {
        return true;
    }

    // Ignore canonical framework tracker hooks that intentionally share
    // the `trackMolecule` contract across the race-detector tracker hierarchy.
    if (isFrameworkTrackerHook(filePath, atomName, semanticFingerprint)) {
        return true;
    }

    // Ignore canonical lifecycle hooks in the initialization pipeline and
    // confidence hooks in extraction strategies. They are framework contracts,
    // not accidental repeated business logic.
    if (
        isInitializationLifecycleHook(filePath, atomName) ||
        isTypeContractStrategyHook(filePath, atomName)
    ) {
        return true;
    }

    // Ignore valid framework orchestration entry points (CLI commands, standalone scripts)
    if (isFrameworkOrchestrationEntryPoint(semanticFingerprint)) {
        return true;
    }

    // Ignore low-signal generated atoms, data-access surfaces, guard helpers,
    // and compatibility wrappers.
    if (isLowSignalOrCompatibilityConceptualDuplicate(filePath, atomName, semanticFingerprint)) {
        return true;
    }

    return false;
}

/**
 * Determines if a structural duplicate finding should be ignored based on policy.
 *
 * Structural duplicates are based on exact name matches (same function name in different files).
 * This function checks if the finding matches any low-signal or policy-excluded pattern.
 *
 * @param {string} filePath - The file path of the atom
 * @param {string} atomName - The name of the atom
 * @returns {boolean} True if the finding should be ignored, false otherwise
 */
export function shouldIgnoreStructuralDuplicateFinding(filePath, atomName) {
    // Ignore if it's the canonical duplicate signal policy file itself
    if (isCanonicalDuplicateSignalPolicyFile(filePath)) {
        return true;
    }

    // Ignore low-signal guard structural helpers
    if (isLowSignalGuardStructuralHelper(filePath, atomName)) {
        return true;
    }

    // Ignore low-signal generated atoms (anonymous, callbacks, etc.)
    if (isLowSignalGeneratedAtom(atomName, '')) {
        return true;
    }

    return false;
}
