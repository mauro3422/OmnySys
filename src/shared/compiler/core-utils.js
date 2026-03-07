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
