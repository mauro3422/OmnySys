/**
 * @fileoverview Utility Helper Duplicate Classification
 *
 * Keeps the utility-helper heuristic separate from the core policy rules so
 * the main duplicate-signal policy stays focused on policy decisions.
 *
 * @module shared/compiler/duplicate-signal-policy/detectors/utility-helper-classification
 */

/**
 * Classifies if an atom is a utility helper duplicate and suggests
 * consolidation location.
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
