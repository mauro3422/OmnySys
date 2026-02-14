/**
 * @fileoverview shared-detector.js
 * 
 * Main shared objects detection logic
 * 
 * @module pattern-detection/detectors/shared-objects-detector/detectors/shared-detector
 */

import { PatternDetector } from '../../detector-base.js';
import { analyzeRiskProfile } from '../analyzers/risk-analyzer.js';

const logger = {
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[SharedObjects] ${msg}`, ...args)
};

export class SharedObjectsDetector extends PatternDetector {
  getId() {
    return 'sharedObjects';
  }
  
  getName() {
    return 'Shared Mutable Objects';
  }
  
  getDescription() {
    return 'Detects truly critical shared mutable state (not config or utils)';
  }
  
  async detect(systemMap) {
    const config = this.config;
    const minUsageCount = config.minUsageCount || 3;
    const minRiskScore = config.minRiskScore || 30;
    
    const findings = [];
    const objectIndex = {};
    
    // Indexar todos los objetos exportados
    for (const [filePath, objects] of Object.entries(systemMap.objectExports || {})) {
      for (const obj of objects) {
        const usages = this.countUsages(obj.name, systemMap);
        const riskProfile = analyzeRiskProfile(obj, usages, filePath, this.config);
        
        objectIndex[`${filePath}:${obj.name}`] = {
          ...obj,
          filePath,
          usages,
          riskProfile
        };
      }
    }
    
    // Identificar objetos críticos
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
        recommendation: this.generateRecommendation(obj),
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
    
    const score = this.calculateScore(findings);
    
    return {
      detector: this.getId(),
      name: this.getName(),
      description: this.getDescription(),
      findings,
      score,
      weight: this.globalConfig.weights?.sharedObjects || 0.20,
      recommendation: findings.length > 0
        ? `Found ${findings.length} critical shared objects (${findings.filter(f => f.severity === 'critical').length} critical)`
        : 'No critical shared mutable state detected'
    };
  }
  
  countUsages(objectName, systemMap) {
    const usages = [];
    
    for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
      for (const importStmt of fileNode.imports || []) {
        for (const spec of importStmt.specifiers || []) {
          if ((spec.imported || spec.local) === objectName) {
            usages.push({
              file: filePath,
              source: importStmt.source,
              line: importStmt.line
            });
          }
        }
      }
    }
    
    return usages;
  }
  
  generateRecommendation(obj) {
    if (obj.riskProfile.type === 'state') {
      return `Consider using Redux, Zustand, or Context API for "${obj.name}"`;
    }
    if (obj.riskProfile.type === 'potential_state') {
      return `Review if "${obj.name}" should be immutable or use state management`;
    }
    return `Monitor usage of "${obj.name}"`;
  }
  
  calculateScore(findings) {
    if (findings.length === 0) return 100;
    
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;
    
    let penalty = critical * 15 + high * 8 + medium * 3;
    
    return Math.max(0, 100 - penalty);
  }
}

export default SharedObjectsDetector;
