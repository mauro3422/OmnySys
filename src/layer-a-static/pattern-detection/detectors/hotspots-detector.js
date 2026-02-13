/**
 * @fileoverview Critical Hotspots Detector V2
 * 
 * Detecta funciones de lógica de negocio con alto uso.
 * NO reporta utilidades (helpers, logging) como hotspots.
 * 
 * CRITERIOS:
 * - Funciones con >10 callers = hotspot potencial
 * - Excluye: helpers, logging, utilidades puras
 * - Risk scoring: Fan-in × Complejidad × Ubicación
 * 
 * @module pattern-detection/detectors/hotspots-detector
 */

import { PatternDetector } from '../detector-base.js';

export class HotspotsDetector extends PatternDetector {
  getId() {
    return 'hotspots';
  }
  
  getName() {
    return 'Critical Function Hotspots';
  }
  
  getDescription() {
    return 'Detects business logic functions with excessive usage that may indicate code smells';
  }
  
  async detect(systemMap) {
    const config = this.config;
    const minUsageThreshold = config.minUsageThreshold || 10;
    const highUsageThreshold = config.highUsageThreshold || 20;
    
    const findings = [];
    
    // Calcular usos de cada función desde function_links
    const usageStats = this.calculateUsageStats(systemMap);
    
    // Analizar cada función con alto uso
    for (const [funcId, stats] of Object.entries(usageStats)) {
      const { usageCount, callers, functionData } = stats;
      
      // Skip si es función utilitaria (no lógica de negocio)
      if (this.isUtilityFunction(funcId, functionData)) {
        continue;
      }
      
      // Calcular risk score basado en múltiples factores
      const riskScore = this.calculateRiskScore(stats, systemMap);
      
      // Solo reportar si supera umbrales
      if (usageCount >= minUsageThreshold && riskScore >= 15) {
        const severity = usageCount >= highUsageThreshold ? 'high' : 'medium';
        const funcName = funcId.split('::').pop();
        
        findings.push({
          id: `hotspot-${funcId}`,
          type: 'function_hotspot',
          severity,
          file: stats.filePath,
          line: functionData?.line || 0,
          message: `Function "${funcName}" called from ${usageCount} places`,
          recommendation: this.generateRecommendation(usageCount, funcName, riskScore),
          metadata: {
            functionName: funcName,
            fullId: funcId,
            filePath: stats.filePath,
            usageCount,
            riskScore,
            callerFiles: callers.slice(0, 5), // Top 5 callers
            isAsync: functionData?.isAsync || false,
            hasSideEffects: functionData?.hasSideEffects || false,
            complexity: functionData?.complexity || 0
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
      weight: this.globalConfig.weights?.hotspots || 0.15,
      recommendation: findings.length > 0
        ? `Found ${findings.length} critical hotspots`
        : 'No critical hotspots detected'
    };
  }
  
  /**
   * Calcula estadísticas de uso desde function_links
   */
  calculateUsageStats(systemMap) {
    const stats = {};
    
    (systemMap.function_links || []).forEach(link => {
      const targetFunc = link.to;
      
      if (!stats[targetFunc]) {
        stats[targetFunc] = {
          usageCount: 0,
          callers: [],
          functionData: this.findFunctionData(targetFunc, systemMap),
          filePath: link.file_to || targetFunc.split('::')[0]
        };
      }
      
      stats[targetFunc].usageCount++;
      
      // Registrar caller único
      const callerFunc = link.from;
      if (!stats[targetFunc].callers.includes(callerFunc)) {
        stats[targetFunc].callers.push(callerFunc);
      }
    });
    
    return stats;
  }
  
  /**
   * Busca datos de la función en el systemMap
   */
  findFunctionData(funcId, systemMap) {
    // Buscar en functions
    if (systemMap.functions && systemMap.functions[funcId]) {
      return systemMap.functions[funcId];
    }
    
    // Buscar en function_links para obtener metadata básica
    const link = (systemMap.function_links || []).find(l => l.to === funcId);
    if (link) {
      return {
        line: link.line,
        isAsync: false
      };
    }
    
    return null;
  }
  
  /**
   * Determina si una función es utilitaria (no lógica de negocio)
   */
  isUtilityFunction(funcId, functionData) {
    const funcName = funcId.split('::').pop()?.toLowerCase() || '';
    const filePath = funcId.split('::')[0]?.toLowerCase() || '';
    
    // Patterns de utilidades
    const utilityPatterns = [
      // Logging
      /^(log|debug|warn|error|info)$/,
      // Getters/Setters simples
      /^get[a-z]/i,
      /^set[a-z]/i,
      /^is[a-z]/i,
      /^has[a-z]/i,
      // Helpers comunes
      /^(format|parse|convert|transform|validate|sanitize|normalize)$/,
      /^(clone|copy|merge|extend|assign|pick|omit)$/,
      /^(map|filter|reduce|find|some|every|foreach)$/,
      /^(includes|indexof|startswith|endswith)$/,
      /^(trim|split|join|slice|splice|concat|push|pop|shift|unshift)$/,
      // Utils
      /^(debounce|throttle|memoize| curry|compose|pipe)$/,
      /^(delay|sleep|wait|timeout|interval)$/,
      /^(uuid|random|hash|encode|decode|encrypt|decrypt)$/
    ];
    
    // Si el nombre coincide con pattern de utilidad
    if (utilityPatterns.some(pattern => pattern.test(funcName))) {
      return true;
    }
    
    // Si está en archivo de utilidades
    if (/utils?|helpers?|tools?|lib\/|shared\/utils/i.test(filePath)) {
      return true;
    }
    
    // Si es función pura sin side effects y muy simple
    if (functionData && 
        !functionData.hasSideEffects && 
        (functionData.complexity || 0) <= 3 &&
        !functionData.isAsync) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calcula risk score basado en múltiples factores
   */
  calculateRiskScore(stats, systemMap) {
    const { usageCount, callers, functionData } = stats;
    let score = 0;
    
    // Factor 1: Cantidad de usos (principal)
    score += Math.min(30, usageCount * 1.5);
    
    // Factor 2: Diversidad de callers (más archivos = más riesgo)
    const uniqueFiles = new Set(callers.map(c => c.split('::')[0])).size;
    score += uniqueFiles * 2;
    
    // Factor 3: Complejidad (si está disponible)
    if (functionData?.complexity) {
      score += Math.min(20, functionData.complexity);
    }
    
    // Factor 4: Side effects
    if (functionData?.hasSideEffects) {
      score += 10;
    }
    
    // Factor 5: Async (más difícil de razonar)
    if (functionData?.isAsync) {
      score += 5;
    }
    
    return score;
  }
  
  /**
   * Genera recomendación específica
   */
  generateRecommendation(usageCount, funcName, riskScore) {
    if (usageCount >= 20) {
      return `Function "${funcName}" is used excessively. Consider if it has too many responsibilities or if it should be split into smaller functions`;
    } else if (riskScore >= 40) {
      return `Function "${funcName}" has high usage and complexity. Review if it's doing too much`;
    } else {
      return `Monitor usage of "${funcName}" as it becomes a hotspot`;
    }
  }
}

export default HotspotsDetector;
