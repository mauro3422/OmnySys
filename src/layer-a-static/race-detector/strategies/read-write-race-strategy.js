/**
 * @fileoverview read-write-race-strategy.js
 *
 * Detects Read-Write (RW) and Write-Read (WR) race conditions
 *
 * @module race-detector/strategies/read-write-race-strategy
 */

import { RaceDetectionStrategy } from './race-detection-strategy/index.js';

/**
 * Strategy for detecting read-write races
 */
export class ReadWriteRaceStrategy extends RaceDetectionStrategy {
  getRaceType() {
    return 'RW';
  }

  /**
   * Detect read-write races
   * @param {Map} sharedState - Map of stateKey to access points
   * @param {Object} project - Project data
   * @returns {Array} - Detected RW races
   */
  detect(sharedState, project) {
    const races = [];

    for (const [stateKey, accesses] of sharedState) {
      // Need at least 2 accesses for a race
      if (accesses.length < 2) continue;

      // Find all read-write pairs
      for (let i = 0; i < accesses.length; i++) {
        for (let j = i + 1; j < accesses.length; j++) {
          const access1 = accesses[i];
          const access2 = accesses[j];

          // Check if one is read and other is write
          if (this.isReadWritePair(access1, access2)) {
            // Check if they can run concurrently
            if (this.canRunConcurrently(access1, access2, project)) {
              const raceType = this.determineRWType(access1, access2);
              races.push(this.createRace(stateKey, access1, access2, raceType));
            }
          }
        }
      }
    }

    return races;
  }

  /**
   * Check if accesses form a read-write pair
   * @private
   */
  isReadWritePair(access1, access2) {
    const types = [access1.type, access2.type];
    
    const readTypes = ['read', 'STATE_READ', 'ACCESS', 'get'];
    const writeTypes = ['write', 'STATE_WRITE', 'MODIFY', 'set', 'initialization'];
    
    const hasRead = types.some(t => readTypes.includes(t));
    const hasWrite = types.some(t => writeTypes.includes(t));
    
    return hasRead && hasWrite;
  }

  /**
   * Determine if it's RW or WR
   * @private
   */
  determineRWType(access1, access2) {
    const writeTypes = ['write', 'STATE_WRITE', 'MODIFY', 'set', 'initialization'];
    
    if (writeTypes.includes(access1.type)) {
      return 'WR'; // Write then Read
    }
    return 'RW'; // Read then Write
  }
}

export default ReadWriteRaceStrategy;
