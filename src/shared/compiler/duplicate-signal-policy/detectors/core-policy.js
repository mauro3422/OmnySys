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
