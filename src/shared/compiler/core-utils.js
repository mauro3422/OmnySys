import {
    safeParseJson,
    hasPersistedStructuredValue,
    parsePersistedField,
    parsePersistedArray
} from '#utils/json-safe.js';

/**
 * @fileoverview Canonical compiler utilities.
 *
 * Centralizes trivial but high-repetition logic like severity normalization,
 * score-to-severity mapping, and level classification.
 *
 * @module shared/compiler/core-utils
 */

/**
 * Normalizes a severity string to a canonical set.
 * @param {string} severity
 * @returns {'critical'|'high'|'medium'|'low'|'info'}
 */
export function normalizeSeverity(severity = 'medium') {
    const normalized = String(severity || 'medium').toLowerCase();
    const valid = ['critical', 'high', 'medium', 'low', 'info'];
    if (valid.includes(normalized)) return normalized;
    return 'medium';
}

/**
 * Maps a canonical severity to a log level/color.
 * @param {string} severity
 * @returns {'error'|'warn'|'info'}
 */
export function severityToLevel(severity = 'medium') {
    const normalized = normalizeSeverity(severity);
    if (normalized === 'critical' || normalized === 'high') return 'error';
    if (normalized === 'info') return 'info';
    return 'warn';
}

/**
 * Converts a numeric score to a canonical severity.
 * Supports scales: 0-1, 0-10, 0-100.
 * @param {number} score
 * @returns {'critical'|'high'|'medium'|'low'}
 */
export function scoreToSeverity(score) {
    const val = Number(score || 0);
    let normalized = val;

    if (val > 10) normalized = val / 100;
    else if (val > 1) normalized = val / 10;

    if (normalized >= 0.8) return 'critical';
    if (normalized >= 0.6) return 'high';
    if (normalized >= 0.3) return 'medium';
    return 'low';
}

/**
 * Strips common prefixes from messages.
 * @param {string} message
 * @param {string} prefix
 * @returns {string}
 */
export function stripPrefix(message = '', prefix = '') {
    if (!prefix) return message;
    const msgStr = String(message || '');
    return msgStr.startsWith(prefix) ? msgStr.slice(prefix.length).trimStart() : msgStr;
}

/**
 * Converts an arbitrary value to an array safely.
 * @param {*} value
 * @returns {Array}
 */
export function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

/**
 * Converts a value to an array and removes falsy entries.
 * @param {*} value
 * @returns {Array}
 */
export function compactArray(value) {
    return safeArray(value).filter(Boolean);
}

/**
 * Safely converts a value to a number.
 * @param {*} value
 * @returns {number}
 */
export function toNumber(value) {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
}

/**
 * Safely computes a ratio.
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number}
 */
export function toRatio(numerator, denominator) {
    const n = toNumber(numerator);
    const d = toNumber(denominator);
    if (!d) return 0;
    return Number((n / d).toFixed(3));
}

export {
    safeParseJson,
    hasPersistedStructuredValue,
    parsePersistedField,
    parsePersistedArray
};
