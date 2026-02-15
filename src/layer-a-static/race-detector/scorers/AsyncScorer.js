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
    this.weights = weights || null;
  }

  score(race) {
    if (!race || !race.accesses || !Array.isArray(race.accesses) || race.accesses.length === 0) {
      return this.weights?.getAsyncWeight('none') || 0.3;
    }
    
    const [access1, access2] = race.accesses;
    
    if (access1?.isAsync && access2?.isAsync) {
      return this.weights?.getAsyncWeight('both') || 1.0;
    } else if (access1?.isAsync || access2?.isAsync) {
      return this.weights?.getAsyncWeight('one') || 0.8;
    } else {
      return this.weights?.getAsyncWeight('none') || 0.3;
    }
  }
}

export default AsyncScorer;
