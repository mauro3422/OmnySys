/**
 * @fileoverview TestingAdvisor.js
 * 
 * Suggests testing levels based on severity.
 * 
 * @module race-detector/scorers/TestingAdvisor
 */

/**
 * Advises on testing levels
 */
export class TestingAdvisor {
  getAdvice(severity) {
    const advice = {
      critical: {
        level: 'mandatory',
        tests: ['unit', 'integration', 'e2e', 'stress'],
        priority: 'P0'
      },
      high: {
        level: 'recommended',
        tests: ['unit', 'integration', 'stress'],
        priority: 'P1'
      },
      medium: {
        level: 'optional',
        tests: ['unit', 'integration'],
        priority: 'P2'
      },
      low: {
        level: 'documentation',
        tests: ['unit'],
        priority: 'P3'
      }
    };

    return advice[severity] || advice.low;
  }
}

export default TestingAdvisor;
