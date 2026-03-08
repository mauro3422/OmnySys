/**
 * @fileoverview Canonical compiler path normalization helpers.
 *
 * Shared by compiler/runtime utilities that need SQLite-compatible forward
 * slash paths without pulling in higher-level repository logic.
 *
 * @module shared/compiler/path-normalization
 */

/**
 * Normaliza filePath a forward slashes para coincidir con formato de DB.
 *
 * @param {string} filePath
 * @returns {string}
 */
export function normalizeFilePath(filePath = '') {
    return String(filePath || '').replace(/\\/g, '/');
}
