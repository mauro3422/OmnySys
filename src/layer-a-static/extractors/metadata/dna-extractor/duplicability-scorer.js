/**
 * @fileoverview Duplicability Scorer
 * Computes duplicability score for atoms
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/duplicability-scorer
 */

/**
 * Computes duplicability score (0-100)
 * Penalizes legitimate patterns that aren't real duplication
 * 
 * @param {Object} atom - Atom object
 * @returns {number} Duplicability score
 */
export function computeDuplicabilityScore(atom) {
  let score = 100; // Base

  // Penalize test framework callbacks (beforeEach, it, describe)
  if (atom.isTestCallback) {
    score -= 60;
    if (atom.testCallbackType === 'beforeEach') score -= 20;
    if (atom.testCallbackType === 'afterEach') score -= 20;
  }

  // Penalize simple class methods (possible polymorphism)
  if (atom.archetype?.type === 'class-method' && atom.complexity === 1 && atom.linesOfCode <= 5) {
    score -= 40;
  }

  // Penalize simple getters/setters
  if (atom.archetype?.type === 'class-method' && atom.name) {
    const name = atom.name.toLowerCase();
    if (name.startsWith('get') || name.startsWith('set') || name.startsWith('is')) {
      if (atom.complexity === 1 && atom.linesOfCode <= 3) {
        score -= 50;
      }
    }
  }

  // Penalize constructors that only call super()
  if (atom.name === 'constructor' && atom.complexity <= 2 && atom.linesOfCode <= 5) {
    score -= 45;
  }

  // Penalize test helpers
  if (atom.purpose === 'TEST_HELPER') {
    score -= 35;
  }

  // Bonify real business code
  if (atom.purpose === 'API_EXPORT' && atom.isExported) {
    score += 15;
  }

  // Bonify moderate-high complexity (business code)
  if (atom.complexity >= 5) {
    score += 10;
  }

  // Bonify long functions (more likely to be real duplication)
  if (atom.linesOfCode > 20) {
    score += 15;
  }

  // Bonify functions with side effects (business logic)
  if (atom.dataFlow?.outputs?.some(o => o.type === 'side_effect')) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}
