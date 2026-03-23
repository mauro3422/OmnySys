/**
 * @fileoverview Shared Objects Detector
 * 
 * Detects truly critical shared mutable state
 * Distinguishes between CONFIG, STATE, and UTILS
 * 
 * @module shared-objects-detector/detector
 */

import { PatternDetector } from '../../detector-base.js';
import { analyzeRiskProfile } from './analyzers/risk-analyzer.js';
import { countUsages } from './analyzers/usage-counter.js';
import { generateRecommendation, scoreSharedObjects } from './analyzers/recommendation-generator.js';

// Simple logger
const logger = {
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[SharedObjects] ${msg}`, ...args)
};

/**
 * Shared Objects Detector
 */
export class SharedObjectsDetector extends PatternDetector {
  constructor(config = {}, globalConfig = {}) {
    super({
      ...config,
      id: 'sharedObjects',
      name: 'Shared Mutable Objects',
      description: 'Detects truly critical shared mutable state (not config or utils)'
    }, globalConfig);
  }
  
  async detect(systemMap) {
    // Handle null/undefined input gracefully
    if (!systemMap) {
      return {
        detector: this.getId(),
        name: this._name || this.getId(),
        description: this._description,
        findings: [],
        score: 100,
        weight: this.globalConfig.weights?.sharedObjects || 0.20,
        recommendation: 'No shared objects detected'
      };
    }
    
    const config = this.config;
    const minUsageCount = config.minUsageCount || 3;
    const minRiskScore = config.minRiskScore || 30;
    
    const findings = [];
    const objectIndex = {};
    
    // Index all exported objects
    for (const [filePath, objects] of Object.entries(systemMap.objectExports || {})) {
      for (const obj of objects) {
        const usages = countUsages(obj.name, systemMap);
        const riskProfile = analyzeRiskProfile(obj, usages, filePath);
        
        objectIndex[`${filePath}:${obj.name}`] = {
          ...obj,
          filePath,
          usages,
          riskProfile
        };
      }
    }
    
    // Identify critical objects
    Object.values(objectIndex).forEach(obj => {
      if (obj.usages.length < minUsageCount) return;
      if (obj.riskProfile.score < minRiskScore) return;
      
      findings.push({
        id: `shared-obj-${obj.name}`,
        type: 'shared_mutable_state',
        severity: obj.riskProfile.score >= 60 ? 'critical' : 
                  obj.riskProfile.score >= 40 ? 'high' : 'medium',
        file: obj.filePath,
        line: obj.line,
        message: `Shared ${obj.riskProfile.type}: "${obj.name}" used in ${obj.usages.length} files`,
        recommendation: generateRecommendation(obj),
        metadata: {
          objectName: obj.name,
          usageCount: obj.usages.length,
          riskScore: obj.riskProfile.score,
          riskFactors: obj.riskProfile.factors,
          objectType: obj.riskProfile.type,
          usages: obj.usages.slice(0, 5)
        }
      });
    });
    
    const score = scoreSharedObjects(findings);
    
    return {
      detector: this.getId(),
      name: this._name || this.getId(),
      description: this._description,
      findings,
      score,
      weight: this.globalConfig.weights?.sharedObjects || 0.20,
      recommendation: findings.length > 0
        ? `Found ${findings.length} critical shared objects (${findings.filter(f => f.severity === 'critical').length} critical)`
        : 'No critical shared mutable state detected'
    };
  }
}

export default SharedObjectsDetector;
