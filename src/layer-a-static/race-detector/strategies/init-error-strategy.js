/**
 * @fileoverview init-error-strategy.js
 *
 * Detects initialization error races (double initialization)
 *
 * @module race-detector/strategies/init-error-strategy
 */

import { RaceDetectionStrategy } from './race-detection-strategy/index.js';

function collectInitializationAccesses(accesses, isInitialization) {
  return (accesses || []).filter(access => isInitialization(access));
}

function buildInitRaceDescription(stateKey, access1, access2) {
  return `Double initialization race on ${stateKey}: ` +
    `${access1.atomName} and ${access2.atomName} ` +
    `may initialize concurrently`;
}

function collectConcurrentInitRaces(strategy, stateKey, initAccesses, project) {
  return initAccesses.flatMap((access1, index) =>
    initAccesses.slice(index + 1).map(access2 => {
      if (!strategy.canRunConcurrently(access1, access2, project)) {
        return null;
      }

      const race = strategy.createRace(stateKey, access1, access2, 'IE');
      race.description = buildInitRaceDescription(stateKey, access1, access2);
      return race;
    }).filter(Boolean)
  );
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
      const initAccesses = collectInitializationAccesses(accesses, access =>
        this.isInitialization(access)
      );

      if (initAccesses.length < 2) continue;

      races.push(...collectConcurrentInitRaces(this, stateKey, initAccesses, project));
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
