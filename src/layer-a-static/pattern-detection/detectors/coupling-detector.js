/**
 * @fileoverview Coupling Detector V2
 * 
 * Detecta acoplamiento arquitectural problemático.
 * NO reporta todo acoplamiento bidireccional, solo el problemático.
 * 
 * CRITERIOS:
 * - Archivos con >15 imports Y >10 dependientes = HIGH risk
 * - Excluye: index files, test utilities, config files
 * - Considera contexto arquitectural
 * 
 * @module pattern-detection/detectors/coupling-detector
 */

import { PatternDetector } from '../detector-base.js';

export class CouplingDetector extends PatternDetector {
  getId() {
    return 'coupling';
  }
  
  getName() {
    return 'Architectural Coupling';
  }
  
  getDescription() {
    return 'Detects files with excessive coupling that may indicate architectural issues';
  }
  
  async detect(systemMap) {
    // Handle null/undefined input gracefully
    if (!systemMap) {
      return {
        detector: this.getId(),
        name: this.getName(),
        description: this.getDescription(),
        findings: [],
        score: 100,
        weight: this.globalConfig.weights?.coupling || 0.15,
        recommendation: 'No coupling issues detected'
      };
    }
    
    const config = this.config;
    const highImportThreshold = config.highImportThreshold || 15;
    const highDependentThreshold = config.highDependentThreshold || 10;
    const criticalImportThreshold = config.criticalImportThreshold || 25;
    
    const findings = [];
    
    // Analizar cada archivo
    for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
      // Skip archivos que son intencionalmente acoplados
      if (this.isIntentionallyCoupled(filePath)) {
        continue;
      }
      
      const importCount = fileNode.imports?.length || 0;
      const dependentCount = fileNode.usedBy?.length || 0;
      
      // Calcular riesgo de acoplamiento
      // No es solo cantidad, es el ratio entre imports y dependientes
      const couplingRatio = (importCount + dependentCount) / 2;
      
      let riskScore = 0;
      let severity = 'low';
      
      // CRITICAL: Muchos imports Y muchos dependientes
      if (importCount >= criticalImportThreshold && dependentCount >= highDependentThreshold) {
        riskScore = 50 + (importCount - criticalImportThreshold) * 2;
        severity = 'critical';
      }
      // HIGH: Muchos imports O muchos dependientes (pero no ambos)
      else if (importCount >= highImportThreshold && dependentCount >= highDependentThreshold) {
        riskScore = 30 + couplingRatio;
        severity = 'high';
      }
      // MEDIUM: Cantidad moderada
      else if (importCount >= 10 && dependentCount >= 5) {
        riskScore = 15 + couplingRatio / 2;
        severity = 'medium';
      }
      
      // Solo reportar si hay riesgo real
      if (riskScore > 20) {
        findings.push({
          id: `coupling-${filePath}`,
          type: 'architectural_coupling',
          severity,
          file: filePath,
          message: this.generateMessage(filePath, importCount, dependentCount, severity),
          recommendation: this.generateRecommendation(importCount, dependentCount),
          metadata: {
            importCount,
            dependentCount,
            couplingRatio,
            riskScore,
            factors: this.identifyRiskFactors(fileNode)
          }
        });
      }
    }
    
    return {
      detector: this.getId(),
      name: this.getName(),
      description: this.getDescription(),
      findings: findings.sort((a, b) => b.metadata.riskScore - a.metadata.riskScore),
      score: this.calculateScore(findings),
      weight: this.globalConfig.weights?.coupling || 0.15,
      recommendation: findings.length > 0
        ? `Found ${findings.length} files with excessive coupling`
        : 'No architectural coupling issues detected'
    };
  }
  
  /**
   * Determina si un archivo está intencionalmente acoplado
   * (no es un problema arquitectural)
   */
  isIntentionallyCoupled(filePath) {
    // Barrel files (index.js) - intencionalmente acoplan
    if (/index\.(js|ts)$/i.test(filePath)) return true;
    
    // Archivos de configuración
    if (/config\//i.test(filePath)) return true;
    
    // Test utilities
    if (/test\/|__tests__\/|\.test\./i.test(filePath)) return true;
    
    // CLI entry points
    if (/cli\/commands\//i.test(filePath)) return true;
    
    // API entry points
    if (/api\/routes\//i.test(filePath)) return true;
    
    return false;
  }
  
  /**
   * Genera mensaje descriptivo del problema
   */
  generateMessage(filePath, imports, dependents, severity) {
    const fileName = filePath.split('/').pop();
    
    if (severity === 'critical') {
      return `${fileName} is a God Object: ${imports} imports, ${dependents} dependents`;
    } else if (imports > dependents) {
      return `${fileName} imports ${imports} modules (high dependency)`;
    } else {
      return `${fileName} is used by ${dependents} modules (high coupling)`;
    }
  }
  
  /**
   * Genera recomendación específica
   */
  generateRecommendation(imports, dependents) {
    if (imports > 20 && dependents > 10) {
      return 'Consider splitting this file into smaller, focused modules';
    } else if (imports > 20) {
      return 'This module depends on too many others. Consider dependency injection or facade pattern';
    } else if (dependents > 10) {
      return 'Many modules depend on this. Ensure it has a stable, minimal interface';
    }
    return 'Review if this level of coupling is intentional';
  }
  
  /**
   * Identifica factores de riesgo adicionales
   */
  identifyRiskFactors(fileNode) {
    const factors = [];
    
    if (fileNode.imports?.length > 20) {
      factors.push('high_imports');
    }
    
    if (fileNode.usedBy?.length > 15) {
      factors.push('high_dependents');
    }
    
    // Si importa y es importado por los mismos archivos (circular potencial)
    const mutualDeps = fileNode.dependsOn?.filter(dep => 
      fileNode.usedBy?.includes(dep)
    ) || [];
    
    if (mutualDeps.length > 0) {
      factors.push('potential_circular_deps');
    }
    
    return factors;
  }
}

export default CouplingDetector;
