/**
 * @fileoverview Shared utility for building standardized remediation plans
 * across the OmnySys compiler.
 *
 * @module shared/compiler/remediation-plan-builder
 */

/**
 * @typedef {Object} RemediationItem
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [file]
 * @property {string} [diagnosis]
 * @property {string[]} recommendedActions
 */

/**
 * Standardizes a remediation plan structure.
 *
 * @param {Object} params
 * @param {number} params.total - Total number of candidates/groups
 * @param {Array} params.items - Remediation items or groups
 * @param {string} params.recommendation - High-level summary recommendation
 * @param {Object} [params.extra] - Additional metadata for the plan
 * @returns {Object} Standardized plan
 */
export function buildStandardPlan({ total, items, recommendation, ...extra }) {
    return {
        total,
        items,
        recommendation: items && items.length > 0
            ? recommendation
            : extra.emptyRecommendation || 'No issues requiring remediation detected.',
        ...extra
    };
}

/**
 * Helper to build a standard remediation item.
 *
 * @param {Object} params
 * @returns {RemediationItem}
 */
export function buildStandardItem({ id, name, file, diagnosis, actions, ...extra }) {
    return {
        id,
        name,
        file,
        diagnosis,
        recommendedActions: Array.isArray(actions) ? actions : [actions],
        ...extra
    };
}
