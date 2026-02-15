/**
 * @fileoverview TypeScorer.js
 * 
 * Scores race by type.
 * 
 * @module race-detector/scorers/TypeScorer
 */

/**
 * Scores race by type
 */
export class TypeScorer {
  constructor(weights) {
    this.weights = weights;
  }

  score(race) {
    if (!race) return 0.5;
    return this.weights?.getTypeWeight(race.type) || 0.5;
  }
}

export default TypeScorer;
