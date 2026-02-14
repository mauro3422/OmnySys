/**
 * @fileoverview DefaultConfig.js
 * 
 * Default configuration for pattern detection.
 * 
 * @module pattern-detection/engine/DefaultConfig
 */

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  thresholds: {
    deepChains: {
      minDepth: 7,
      maxAcceptable: 20,
      riskMultiplier: 2
    },
    sharedObjects: {
      minUsageCount: 3,
      minRiskScore: 30,
      configPatterns: [
        /^CONFIG$/i, /^SETTINGS$/i, /^OPTIONS$/i,
        /^DEFAULTS$/i, /^CONSTANTS$/i, /^ENV$/i
      ],
      statePatterns: [
        /store$/i, /state$/i, /manager$/i,
        /cache$/i, /registry$/i, /pool$/i, /queue$/i
      ]
    },
    circularDeps: {
      minFilesInCycle: 3,
      maxAcceptable: 10
    },
    coupling: {
      highThreshold: 15,
      criticalThreshold: 25
    },
    unusedExports: {
      ignorePatterns: [
        /index\.js$/i,
        /\.test\.js$/i,
        /\.spec\.js$/i,
        /types\.js$/i
      ],
      minExports: 5
    }
  },
  weights: {
    deepChains: 0.15,
    sharedObjects: 0.20,
    circularDeps: 0.15,
    coupling: 0.15,
    unusedExports: 0.10,
    hotspots: 0.15,
    unusedImports: 0.10
  },
  projectType: 'standard',
  features: {
    enableHeuristics: true,
    enableHistory: false,
    enableSemantic: true
  }
};

export default DEFAULT_CONFIG;
