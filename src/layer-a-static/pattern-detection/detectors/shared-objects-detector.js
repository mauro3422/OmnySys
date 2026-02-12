/**
 * @fileoverview Shared Objects Detector V2
 * 
 * Detecta objetos compartidos mutables que son REALMENTE problemáticos.
 * Distingue entre:
 * - CONFIG (bajo riesgo): Constantes de configuración
 * - STATE (alto riesgo): Estado mutable compartido
 * - UTILS (bajo riesgo): Funciones puras compartidas
 * 
 * @module pattern-detection/detectors/shared-objects
 */

import { PatternDetector } from '../detector-base.js';

// Simple logger
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
        const riskProfile = this.analyzeRiskProfile(obj, usages, filePath);
        
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
      // Solo objetos realmente compartidos
      if (obj.usages.length < minUsageCount) return;
      
      // Solo objetos con riesgo significativo
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
          usages: obj.usages.slice(0, 5) // Top 5 usos
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
  
  /**
   * Cuenta usos reales de un objeto (imports desde otros archivos)
   */
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
  
  /**
   * Analiza el perfil de riesgo de un objeto
   */
  analyzeRiskProfile(obj, usages, filePath) {
    const factors = [];
    let score = 0;
    let type = 'unknown';
    
    // === HEURÍSTICA 0: Usar metadatos del extractor (si están disponibles) ===
    if (obj.objectType && obj.riskLevel) {
      // El extractor ya determinó el tipo basado en AST
      switch (obj.objectType) {
        case 'enum':
          score -= 30; // Enum puro = muy bajo riesgo
          type = 'enum';
          factors.push('extractor:enum');
          break;
        case 'state':
          score += 40; // Estado con métodos = alto riesgo
          type = 'state';
          factors.push('extractor:state');
          break;
        case 'data_structure':
          score += 5; // Estructura de datos = riesgo moderado
          type = 'data_structure';
          factors.push('extractor:data_structure');
          break;
        case 'mixed':
          score += 15; // Mixto = riesgo medio
          type = 'mixed';
          factors.push('extractor:mixed');
          break;
      }
      
      // Ajustar según riskLevel del extractor
      if (obj.riskLevel === 'low') {
        score = Math.min(score, 10); // Max 10 para low risk
      } else if (obj.riskLevel === 'high') {
        score = Math.max(score, 40); // Min 40 para high risk
      }
    }
    
    // === HEURÍSTICA 1: Nombre sugiere CONFIG (reduce riesgo) ===
    const isConfig = this.isConfigObject(obj.name);
    if (isConfig) {
      score -= 25;
      if (type === 'unknown') type = 'config';
      factors.push('naming:config');
    }
    
    // === HEURÍSTICA 2: Nombre sugiere STATE (aumenta riesgo) ===
    const isState = this.isStateObject(obj.name, obj, filePath);
    if (isState) {
      score += 35;
      if (type === 'unknown') type = 'state';
      factors.push('naming:state');
    }
    
    // === HEURÍSTICA 3: Nombre sugiere UTILS (bajo riesgo) ===
    const isUtils = this.isUtilsObject(obj.name);
    if (isUtils) {
      score -= 15;
      if (type === 'unknown') type = 'utils';
      factors.push('naming:utils');
    }
    
    // === HEURÍSTICA 4: Detalles de propiedades (si están disponibles) ===
    if (obj.propertyDetails && Array.isArray(obj.propertyDetails)) {
      const highRiskProps = obj.propertyDetails.filter(p => p.risk === 'high').length;
      const mediumRiskProps = obj.propertyDetails.filter(p => p.risk === 'medium').length;
      const lowRiskProps = obj.propertyDetails.filter(p => p.risk === 'low').length;
      
      if (highRiskProps > 0) {
        score += highRiskProps * 10;
        factors.push(`properties:functions:${highRiskProps}`);
      }
      
      if (lowRiskProps > 0 && highRiskProps === 0) {
        // Solo valores literales = es un enum
        score -= 20;
        if (type === 'unknown') type = 'enum';
        factors.push('properties:only_literals');
      }
    }
    
    // === HEURÍSTICA 5: Es mutable según el parser ===
    if (obj.isMutable) {
      // Solo añadir riesgo si no es un enum confirmado
      if (type !== 'enum' && type !== 'config') {
        score += 15;
        factors.push('parser:mutable');
      }
    } else {
      score -= 10;
      factors.push('parser:immutable');
    }
    
    // === HEURÍSTICA 6: Cantidad de usos ===
    // Menos riesgo para enums/configs con muchos usos (es normal)
    const isLowRiskType = type === 'enum' || type === 'config';
    
    if (usages.length >= 10) {
      if (!isLowRiskType) {
        score += 20;
        factors.push('usage:high');
      } else {
        score -= 5; // Es normal que enums tengan muchos usos
        factors.push('usage:high_but_enum');
      }
    } else if (usages.length >= 5) {
      if (!isLowRiskType) {
        score += 10;
        factors.push('usage:medium');
      }
    }
    
    // === HEURÍSTICA 7: Ubicación del archivo ===
    if (filePath && /config\/(change-)?types|config\/constants|types\.js$/i.test(filePath)) {
      // Archivos de tipos/configuración = menos riesgo
      score -= 15;
      factors.push('location:config_file');
    }
    
    // Determinar tipo final
    if (type === 'unknown') {
      if (score > 20) type = 'potential_state';
      else if (score < -10) type = 'likely_config';
      else type = 'neutral';
    }
    
    return {
      score: Math.max(0, score),
      type,
      factors
    };
  }
  
  isConfigObject(name) {
    const patterns = this.config.configPatterns || [
      /^CONFIG$/i, /^SETTINGS$/i, /^OPTIONS$/i,
      /^DEFAULTS$/i, /^CONSTANTS$/i, /^ENV$/i,
      /^CFG$/i, /^CONF$/i
    ];
    return patterns.some(p => p.test(name));
  }
  
  isStateObject(name, obj, filePath) {
    const patterns = this.config.statePatterns || [
      /store$/i, /state$/i, /manager$/i,
      /cache$/i, /registry$/i, /pool$/i, /queue$/i,
      /buffer$/i, /stack$/i, /heap$/i,
      /global$/i, /shared$/i, /mutable$/i,
      /context$/i, /provider$/i
    ];
    
    // Si el nombre coincide con patrones de estado
    const matchesPattern = patterns.some(p => p.test(name));
    
    if (!matchesPattern) return false;
    
    // HEURÍSTICA: Si está en archivo de tipos/constantes, probablemente sea enum
    // Ej: src/config/change-types.js, src/config/constants.js
    const isInTypesFile = filePath && (
      /config\/(change-)?types/i.test(filePath) ||
      /config\/constants/i.test(filePath) ||
      /types\.js$/i.test(filePath)
    );
    
    if (isInTypesFile) {
      return false; // Probablemente es enum/constante, no estado mutable
    }
    
    // HEURÍSTICA: Si el nombre termina en "State" o "Type" y todas las propiedades
    // son solo lectura (no hay métodos set/update/remove), es enum
    // Nota: esto requeriría análisis AST más profundo
    
    return true;
  }
  
  isUtilsObject(name) {
    const patterns = [
      /utils?$/i, /helpers?$/i, /tools?$/i,
      /lib$/i, /library$/i, /common$/i,
      /shared\/utils/i
    ];
    return patterns.some(p => p.test(name));
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
    
    // Penalización severa por objetos críticos
    let penalty = critical * 15 + high * 8 + medium * 3;
    
    return Math.max(0, 100 - penalty);
  }
}

export default SharedObjectsDetector;
