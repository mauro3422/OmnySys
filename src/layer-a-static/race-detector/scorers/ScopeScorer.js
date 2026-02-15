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
    if (!race) return 0.5;
    return this.weights?.getScopeWeight(race.stateType) || 0.5;
  }
}

export default ScopeScorer;
