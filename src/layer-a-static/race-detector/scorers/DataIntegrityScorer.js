/**
 * @fileoverview DataIntegrityScorer.js
 * 
 * Scores race by data integrity risk.
 * 
 * @module race-detector/scorers/DataIntegrityScorer
 */

/**
 * Scores race by data integrity risk
 */
export class DataIntegrityScorer {
  constructor(weights) {
    this.weights = weights;
  }

  score(race) {
    const stateType = race.stateType;
    let base = this.weights.getDataIntegrityWeight('medium');

    switch (stateType) {
      case 'global':
        base = this.weights.getDataIntegrityWeight('high');
        break;
      case 'external':
        base = this.weights.getDataIntegrityWeight('critical');
        break;
      case 'singleton':
        base = this.weights.getDataIntegrityWeight('high');
        break;
      case 'module':
        base = this.weights.getDataIntegrityWeight('medium');
        break;
      case 'closure':
        base = this.weights.getDataIntegrityWeight('low');
        break;
    }

    if (race.type === 'WW') {
      base = Math.min(base * 1.2, 1.0);
    } else if (race.type === 'IE') {
      base = Math.min(base * 1.1, 1.0);
    }

    return base;
  }
}

export default DataIntegrityScorer;
