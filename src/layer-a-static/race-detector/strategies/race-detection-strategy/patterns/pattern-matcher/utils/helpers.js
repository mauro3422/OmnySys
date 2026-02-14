/**
 * @fileoverview helpers.js
 * 
 * Helper utilities
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/utils/helpers
 */

/**
 * Find atom by ID
 */
export function findAtom(atomId, project) {
  for (const module of project.modules || []) {
    for (const molecule of module.files || []) {
      for (const atom of molecule.atoms || []) {
        if (atom.id === atomId) {
          return atom;
        }
      }
    }
  }
  return null;
}

/**
 * Convert severity to numeric rank
 */
export function severityRank(severity) {
  const ranks = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };
  return ranks[severity] || 0;
}
