/**
 * @fileoverview FrequencyScorer.js
 * 
 * Scores race by access frequency.
 * 
 * @module race-detector/scorers/FrequencyScorer
 */

/**
 * Scores race by access frequency
 */
export class FrequencyScorer {
  score(race) {
    if (!race || !race.accesses || !Array.isArray(race.accesses)) {
      return 0.5;
    }
    const accesses = race.accesses;

    if (accesses.length > 2) {
      return 0.8 + (accesses.length - 2) * 0.05;
    }

    return 0.5;
  }
}

export default FrequencyScorer;
