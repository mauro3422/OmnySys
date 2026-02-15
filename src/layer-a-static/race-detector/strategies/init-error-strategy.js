/**
 * @fileoverview init-error-strategy.js
 *
 * Detects initialization error races (double initialization)
 *
 * @module race-detector/strategies/init-error-strategy
 */

import { RaceDetectionStrategy } from './race-detection-strategy/index.js';

/**
 * Strategy for detecting initialization races
 */
export class InitErrorStrategy extends RaceDetectionStrategy {
  getRaceType() {
    return 'IE';
  }

  /**
   * Detect initialization races
   * @param {Map} sharedState - Map of stateKey to access points
   * @param {Object} project - Project data
   * @returns {Array} - Detected IE races
   */
  detect(sharedState, project) {
    const races = [];

    for (const [stateKey, accesses] of sharedState) {
      // Find initialization accesses
      const initAccesses = accesses.filter(a => this.isInitialization(a));
      
      if (initAccesses.length < 2) continue;

      // Multiple initializations = potential race
      for (let i = 0; i < initAccesses.length; i++) {
        for (let j = i + 1; j < initAccesses.length; j++) {
          const access1 = initAccesses[i];
          const access2 = initAccesses[j];

          // Check if they can run concurrently
          if (this.canRunConcurrently(access1, access2, project)) {
            const race = this.createRace(stateKey, access1, access2, 'IE');
            race.description = `Double initialization race on ${stateKey}: ` +
                             `${access1.atomName} and ${access2.atomName} ` +
                             `may initialize concurrently`;
            races.push(race);
          }
        }
      }
    }

    return races;
  }

  /**
   * Check if access is an initialization
   * @private
   */
  isInitialization(access) {
    return access.type === 'initialization' ||
           access.operation === 'initialization';
  }
}

export default InitErrorStrategy;
