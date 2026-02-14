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
    return this.weights.getTypeWeight(race.type);
  }
}

export default TypeScorer;
