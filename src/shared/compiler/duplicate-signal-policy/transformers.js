/**
 * @fileoverview Transformer helpers for duplicate signal policy.
 *
 * Contains normalization and matching utilities used across duplicate
 * signal policy detection.
 *
 * @module shared/compiler/duplicate-signal-policy.transformer
 */

import { normalizeFilePath } from '../path-normalization.js';

/**
 * Normalizes input parameters for duplicate signal policy checks.
 * @param {string} filePath - File path to normalize
 * @param {string} atomName - Atom name to normalize
 * @param {string} semanticFingerprint - Semantic fingerprint to normalize
 * @returns {{normalizedPath: string, normalizedName: string, fingerprint: string}}
 */
export function normalizeDuplicateSignalInputs(filePath, atomName, semanticFingerprint) {
    return {
        normalizedPath: normalizeFilePath(filePath).replace(/\\/g, '/').toLowerCase(),
        normalizedName: String(atomName || '').toLowerCase(),
        fingerprint: String(semanticFingerprint || '').toLowerCase()
    };
}

/**
 * Checks if a normalized path matches any of the provided path markers.
 * @param {string} normalizedPath - Normalized file path
 * @param {string[]} pathMatchers - Path markers to match
 * @param {'includes'|'endsWith'} mode - Matching mode
 * @returns {boolean}
 */
export function matchesPolicyPath(normalizedPath, pathMatchers = [], mode = 'includes') {
    return pathMatchers.some((marker) => (
        mode === 'endsWith' ? normalizedPath.endsWith(marker) : normalizedPath.includes(marker)
    ));
}

/**
 * Matches a file/atom/fingerprint combination against a named policy surface.
 * @param {string} filePath - File path
 * @param {string} atomName - Atom name
 * @param {string} semanticFingerprint - Semantic fingerprint
 * @param {Object} options - Matching options
 * @returns {boolean}
 */
export function matchesNamedPolicySurface(filePath, atomName, semanticFingerprint, options = {}) {
    const {
        pathMatchers = [],
        pathMode = 'includes',
        names = null,
        nameRegex = null,
        fingerprints = null,
        extraFingerprintMatchers = []
    } = options;
    const { normalizedPath, normalizedName, fingerprint } = normalizeDuplicateSignalInputs(
        filePath,
        atomName,
        semanticFingerprint
    );

    if (pathMatchers.length > 0 && !matchesPolicyPath(normalizedPath, pathMatchers, pathMode)) {
        return false;
    }

    const hasNameMatch = names ? names.has(normalizedName) : nameRegex?.test(normalizedName);
    if (!hasNameMatch) return false;
    if (!fingerprint) return true;
    if (fingerprints?.has(fingerprint)) return true;

    return extraFingerprintMatchers.some((matcher) => matcher(normalizedName, fingerprint));
}
