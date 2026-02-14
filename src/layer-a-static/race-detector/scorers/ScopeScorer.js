/**
 * @fileoverview ScopeScorer.js
 * 
 * Scores race by scope.
 * 
 * @module race-detector/scorers/ScopeScorer
 */

/**
 * Scores race by scope
 */
export class ScopeScorer {
  constructor(weights) {
    this.weights = weights;
  }

  score(race) {
    return this.weights.getScopeWeight(race.stateType);
  }
}

export default ScopeScorer;
