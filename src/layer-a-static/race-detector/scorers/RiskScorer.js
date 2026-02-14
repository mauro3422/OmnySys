/**
 * @fileoverview RiskScorer.js
 * 
 * Calculates severity/risk for detected race conditions.
 * 
 * @module race-detector/scorers/RiskScorer
 */

import { ScoreWeights } from '../factors/ScoreWeights.js';
import { TypeScorer } from './TypeScorer.js';
import { AsyncScorer } from './AsyncScorer.js';
import { DataIntegrityScorer } from './DataIntegrityScorer.js';
import { ScopeScorer } from './ScopeScorer.js';
import { ImpactScorer } from './ImpactScorer.js';
import { FrequencyScorer } from './FrequencyScorer.js';
import { TestingAdvisor } from './TestingAdvisor.js';

/**
 * Calculates risk scores for race conditions
 */
export class RiskScorer {
  constructor() {
    this.weights = new ScoreWeights();
    this.typeScorer = new TypeScorer(this.weights);
    this.asyncScorer = new AsyncScorer(this.weights);
    this.integrityScorer = new DataIntegrityScorer(this.weights);
    this.scopeScorer = new ScopeScorer(this.weights);
    this.impactScorer = new ImpactScorer();
    this.frequencyScorer = new FrequencyScorer();
    this.testingAdvisor = new TestingAdvisor();
  }

  /**
   * Calculate risk score for a race
   */
  calculate(race, projectData) {
    const scores = {
      type: this.typeScorer.score(race),
      async: this.asyncScorer.score(race),
      dataIntegrity: this.integrityScorer.score(race),
      scope: this.scopeScorer.score(race),
      impact: this.impactScorer.score(race, projectData),
      frequency: this.frequencyScorer.score(race)
    };

    const totalScore = (
      scores.type * 0.25 +
      scores.async * 0.20 +
      scores.dataIntegrity * 0.20 +
      scores.scope * 0.15 +
      scores.impact * 0.15 +
      scores.frequency * 0.05
    );

    return this.scoreToSeverity(totalScore);
  }

  /**
   * Convert score to severity
   */
  scoreToSeverity(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Generate explanation of score
   */
  explainScore(race, projectData) {
    const factors = [];

    if (this.typeScorer.score(race) >= 0.8) {
      factors.push(`${race.type} race type is highly dangerous`);
    }

    if (this.asyncScorer.score(race) >= 0.8) {
      factors.push('Both accesses are async, high concurrency risk');
    }

    if (this.integrityScorer.score(race) >= 0.8) {
      factors.push('High risk of data corruption or loss');
    }

    if (this.scopeScorer.score(race) >= 0.8) {
      factors.push(`Global/external state: ${race.stateKey}`);
    }

    if (this.impactScorer.score(race, projectData) >= 0.7) {
      factors.push('Affects critical business flows or entry points');
    }

    return factors;
  }

  /**
   * Suggest testing level based on severity
   */
  suggestTestingLevel(severity) {
    return this.testingAdvisor.getAdvice(severity);
  }

  /**
   * Update weights
   */
  setWeights(newWeights) {
    this.weights.update(newWeights);
  }
}

export default RiskScorer;
