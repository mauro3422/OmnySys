/**
 * @fileoverview Config Builders
 * 
 * Builders for creating configuration test fixtures.
 * 
 * @module tests/factories/pattern-detection-test/builders/config-builders
 */

/**
 * Create default configuration
 */
export function createDefaultConfig(overrides = {}) {
  return {
    thresholds: {
      deepChains: {
        minDepth: 7,
        maxAcceptable: 20,
        riskMultiplier: 2
      },
      sharedObjects: {
        minUsageCount: 3,
        minRiskScore: 30
      },
      coupling: {
        highThreshold: 15,
        criticalThreshold: 25
      },
      hotspots: {
        minUsageThreshold: 10,
        highUsageThreshold: 20
      }
    },
    weights: {
      deepChains: 0.15,
      sharedObjects: 0.20,
      coupling: 0.15,
      hotspots: 0.15,
      unusedExports: 0.10
    },
    projectType: 'standard',
    ...overrides
  };
}
