/**
 * @fileoverview init-error-strategy.js
 *
 * Detects initialization error races (double initialization)
 *
 * @module race-detector/strategies/init-error-strategy
 */

import { RaceDetectionStrategy } from './race-detection-strategy/index.js';

function collectInitializationAccesses(accesses, isInitialization) {
  const initAccesses = [];

  for (const access of accesses) {
    if (isInitialization(access)) {
      initAccesses.push(access);
    }
  }

  return initAccesses;
}

function buildInitRaceDescription(stateKey, access1, access2) {
  return `Double initialization race on ${stateKey}: ` +
    `${access1.atomName} and ${access2.atomName} ` +
    `may initialize concurrently`;
}

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
      const initAccesses = collectInitializationAccesses(accesses, (access) =>
        this.isInitialization(access)
      );

      if (initAccesses.length < 2) continue;

      for (let i = 0; i < initAccesses.length; i++) {
        for (let j = i + 1; j < initAccesses.length; j++) {
          const access1 = initAccesses[i];
          const access2 = initAccesses[j];

          if (this.canRunConcurrently(access1, access2, project)) {
            const race = this.createRace(stateKey, access1, access2, 'IE');
            race.description = buildInitRaceDescription(stateKey, access1, access2);
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
