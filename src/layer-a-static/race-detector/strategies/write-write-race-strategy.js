/**
 * @fileoverview write-write-race-strategy.js
 *
 * Detects Write-Write (WW) race conditions
 *
 * @module race-detector/strategies/write-write-race-strategy
 */

import { RaceDetectionStrategy } from './race-detection-strategy.js';

/**
 * Strategy for detecting write-write races
 */
export class WriteWriteRaceStrategy extends RaceDetectionStrategy {
  getRaceType() {
    return 'WW';
  }

  /**
   * Detect write-write races
   * @param {Map} sharedState - Map of stateKey to access points
   * @param {Object} project - Project data
   * @returns {Array} - Detected WW races
   */
  detect(sharedState, project) {
    const races = [];

    for (const [stateKey, accesses] of sharedState) {
      if (accesses.length < 2) continue;

      // Find all write-write pairs
      for (let i = 0; i < accesses.length; i++) {
        for (let j = i + 1; j < accesses.length; j++) {
          const access1 = accesses[i];
          const access2 = accesses[j];

          // Both must be writes
          if (this.isWrite(access1) && this.isWrite(access2)) {
            // Check concurrency
            if (this.canRunConcurrently(access1, access2, project)) {
              races.push(this.createRace(stateKey, access1, access2, 'WW'));
            }
          }
        }
      }
    }

    return races;
  }

  /**
   * Check if access is a write operation
   * @private
   */
  isWrite(access) {
    const writeTypes = [
      'write', 
      'STATE_WRITE', 
      'MODIFY', 
      'set',
      'initialization',
      'captured_write'
    ];
    
    return writeTypes.includes(access.type);
  }
}

export default WriteWriteRaceStrategy;
