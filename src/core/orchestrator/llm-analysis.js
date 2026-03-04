/**
 * @fileoverview llm-analysis.js
 *
 * Compatibility shim for legacy LLM-priority tests/imports.
 * LLM execution is currently disabled, but this deterministic
 * mapper is still useful for ranking archetype severity.
 */

const PRIORITY_RANK = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const ARCHETYPE_PRIORITY = {
  'god-object': 'critical',
  'orphan-module': 'high',
  'state-manager': 'high',
  'event-hub': 'high',
  'dynamic-importer': 'medium',
  singleton: 'medium',
  facade: 'low'
};

/**
 * Calculates queue priority for a set of detected archetypes.
 *
 * @param {Array<{type?: string, requiresLLM?: boolean}>} archetypes
 * @param {Object} _metadata - Reserved for future heuristics.
 * @returns {'critical'|'high'|'medium'|'low'}
 */
export function _calculateLLMPriority(archetypes = [], _metadata = {}) {
  if (!Array.isArray(archetypes) || archetypes.length === 0) {
    return 'low';
  }

  let best = 'low';

  for (const item of archetypes) {
    const type = typeof item === 'string' ? item : item?.type;
    if (!type) continue;

    const priority = ARCHETYPE_PRIORITY[type] || 'low';
    if (PRIORITY_RANK[priority] > PRIORITY_RANK[best]) {
      best = priority;
    }

    if (best === 'critical') {
      break;
    }
  }

  return best;
}
