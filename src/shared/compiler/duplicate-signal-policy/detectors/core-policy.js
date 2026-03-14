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

    // Ignore low-signal generated atoms (anonymous, callbacks, etc.)
    if (isLowSignalGeneratedAtom(atomName, semanticFingerprint)) {
        return true;
    }

    // Ignore low-signal data access fingerprints
    if (isLowSignalConceptualFingerprint(filePath, atomName, semanticFingerprint)) {
        return true;
    }

    // Ignore guard utility conceptual fingerprints
    if (isGuardUtilityConceptualFingerprint(filePath, atomName, semanticFingerprint)) {
        return true;
    }

    // Ignore compatibility wrappers
    if (isCompatibilityWrapper(filePath, atomName, semanticFingerprint)) {
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

// ============================================================================
// UTILITY HELPER CLASSIFICATION
// ============================================================================

/**
 * Classifies if an atom is a utility helper duplicate and suggests consolidation location.
 *
 * Utility helpers are small functions that provide generic functionality like:
 * - Validation helpers (isValid, isEmpty, hasProperty)
 * - Transformation helpers (normalize, format, parse)
 * - Guard utilities (ensureExists, validateRequired)
 * - Common operations that should live in shared utility modules
 *
 * @param {string} filePath - The file path of the atom
 * @param {string} atomName - The name of the atom
 * @param {string} semanticFingerprint - The semantic fingerprint of the atom
 * @returns {{ isUtilityHelper: boolean, reason?: string, suggestedLocation?: string }}
 *          Classification result with optional suggestion for consolidation
 */
export function classifyUtilityHelperDuplicate(filePath, atomName, semanticFingerprint) {
    const result = { isUtilityHelper: false };

    // Check for validation helper patterns
    const validationPatterns = [
        /^is[A-Z]/,      // isValid, isEmpty, etc.
        /^has[A-Z]/,     // hasProperty, hasKey, etc.
        /^can[A-Z]/,     // canAccess, canExecute, etc.
        /^should[A-Z]/,  // shouldRender, shouldUpdate, etc.
        /^validate[A-Z]/,
        /^check[A-Z]/,
        /^ensure[A-Z]/,
        /^require[A-Z]/
    ];

    if (validationPatterns.some(pattern => pattern.test(atomName))) {
        result.isUtilityHelper = true;
        result.reason = 'Validation/guard helper pattern';
        result.suggestedLocation = 'src/shared/compiler/guards/ or src/core/validation/';
        return result;
    }

    // Check for transformation helper patterns
    const transformPatterns = [
        /^normalize[A-Z]/,
        /^format[A-Z]/,
        /^parse[A-Z]/,
        /^convert[A-Z]/,
        /^transform[A-Z]/,
        /^sanitize[A-Z]/
    ];

    if (transformPatterns.some(pattern => pattern.test(atomName))) {
        result.isUtilityHelper = true;
        result.reason = 'Transformation helper pattern';
        result.suggestedLocation = 'src/shared/compiler/utils/ or src/shared/transformers/';
        return result;
    }

    // Check for generic utility patterns
    const utilityPatterns = [
        /^get[A-Z]/,     // getProperty, getId, etc.
        /^set[A-Z]/,     // setProperty, setValue, etc.
        /^build[A-Z]/,   // buildQuery, buildPath, etc.
        /^create[A-Z]/,  // createError, createId, etc.
        /^make[A-Z]/,    // makeId, makeKey, etc.
        /^extract[A-Z]/,
        /^collect[A-Z]/,
        /^merge[A-Z]/,
        /^clone[A-Z]/
    ];

    if (utilityPatterns.some(pattern => pattern.test(atomName))) {
        result.isUtilityHelper = true;
        result.reason = 'Generic utility helper pattern';
        result.suggestedLocation = 'src/shared/compiler/utils/ or src/core/helpers/';
        return result;
    }

    // Check semantic fingerprint for utility-like behavior
    const utilityFingerprints = [
        'validation',
        'guard',
        'transform',
        'format',
        'parse',
        'normalize',
        'sanitize'
    ];

    if (utilityFingerprints.some(fp => semanticFingerprint.toLowerCase().includes(fp))) {
        result.isUtilityHelper = true;
        result.reason = 'Semantic fingerprint indicates utility behavior';
        result.suggestedLocation = 'src/shared/compiler/utils/ or src/shared/transformers/';
        return result;
    }

    return result;
}
