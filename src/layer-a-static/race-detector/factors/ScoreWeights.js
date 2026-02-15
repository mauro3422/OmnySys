/**
 * @fileoverview ScoreWeights.js
 * 
 * Manages scoring weights.
 * 
 * @module race-detector/factors/ScoreWeights
 */

/**
 * Manages scoring weights
 */
export class ScoreWeights {
  constructor() {
    this.weights = {
      type: {
        'WW': 1.0,
        'RW': 0.8,
        'IE': 0.9,
        'EH': 0.7,
        'OTHER': 0.5
      },
      async: {
        both: 1.0,
        one: 0.8,
        none: 0.3
      },
      dataIntegrity: {
        critical: 1.0,
        high: 0.8,
        medium: 0.5,
        low: 0.2
      },
      scope: {
        global: 1.0,
        module: 0.7,
        external: 0.9,
        singleton: 0.8,
        closure: 0.4
      }
    };
  }

  getTypeWeight(type) {
    return this.weights.type[type] || 0.5;
  }

  getAsyncWeight(asyncType) {
    return this.weights.async[asyncType] || 0.5;
  }

  getDataIntegrityWeight(level) {
    return this.weights.dataIntegrity[level] || 0.5;
  }

  getScopeWeight(scopeType) {
    return this.weights.scope[scopeType] || 0.5;
  }

  update(newWeights) {
    if (!newWeights || typeof newWeights !== 'object') return;
    // Deep merge weights
    for (const category of ['type', 'async', 'dataIntegrity', 'scope']) {
      if (newWeights[category]) {
        this.weights[category] = { ...this.weights[category], ...newWeights[category] };
      }
    }
  }
}

export default ScoreWeights;
