/**
 * @fileoverview AsyncScorer.js
 * 
 * Scores race by async characteristics.
 * 
 * @module race-detector/scorers/AsyncScorer
 */

/**
 * Scores race by async characteristics
 */
export class AsyncScorer {
  constructor(weights) {
    this.weights = weights;
  }

  score(race) {
    const [access1, access2] = race.accesses;
    
    if (access1.isAsync && access2.isAsync) {
      return this.weights.getAsyncWeight('both');
    } else if (access1.isAsync || access2.isAsync) {
      return this.weights.getAsyncWeight('one');
    } else {
      return this.weights.getAsyncWeight('none');
    }
  }
}

export default AsyncScorer;
