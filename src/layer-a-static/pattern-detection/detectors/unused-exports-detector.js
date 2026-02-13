/**
 * @fileoverview Unused Exports Detector V2
 * 
 * Wrapper que usa el análisis legacy como detector V2
 * Esto permite migrar gradualmente sin romper funcionalidad
 * 
 * @module pattern-detection/detectors/unused-exports-detector
 */

import { PatternDetector } from '../detector-base.js';
import { findUnusedExports } from '../../analyses/tier1/unused-exports.js';

export class UnusedExportsDetector extends PatternDetector {
  getId() {
    return 'unusedExports';
  }
  
  getName() {
    return 'Unused Exports';
  }
  
  getDescription() {
    return 'Detects exports that are never imported';
  }
  
  async detect(systemMap) {
    // Usar análisis legacy
    const result = findUnusedExports(systemMap);
    
    // Convertir a formato V2
    const findings = [];
    
    Object.entries(result.byFile || {}).forEach(([filePath, exports]) => {
      exports.forEach(exp => {
        // Solo reportar si no es barrel file intencional
        const isBarrel = filePath.includes('index.js') && exports.length > 5;
        
        if (!isBarrel) {
          findings.push({
            id: `unused-export-${filePath}-${exp.name}`,
            type: 'unused_export',
            severity: exp.severity === 'warning' ? 'medium' : 'low',
            file: filePath,
            line: exp.line,
            message: `Export "${exp.name}" is never imported`,
            recommendation: 'Consider removing or marking as @internal',
            metadata: {
              exportName: exp.name,
              callers: exp.callers
            }
          });
        }
      });
    });
    
    return {
      detector: this.getId(),
      name: this.getName(),
      description: this.getDescription(),
      findings,
      score: this.calculateScore(findings),
      weight: this.globalConfig.weights?.unusedExports || 0.10,
      recommendation: findings.length > 0 
        ? `Found ${findings.length} unused exports`
        : 'No unused exports detected'
    };
  }
}

export default UnusedExportsDetector;
