/**
 * @fileoverview Deep Chains Detector V2
 * 
 * Detecta cadenas de dependencias profundas que son REALMENTE problemáticas.
 * NO cuenta todas las cadenas, solo las de alto riesgo.
 * 
 * CRITERIOS DE RIESGO:
 * 1. Profundidad > 7 (configurable)
 * 2. Alto fan-in en el nodo raíz (muchas funciones dependen de él)
 * 3. Complejidad ciclomática acumulada alta
 * 
 * @module pattern-detection/detectors/deep-chains
 */

import { PatternDetector } from '../detector-base.js';

// Simple logger
const logger = {
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[DeepChains] ${msg}`, ...args)
};

export class DeepChainsDetector extends PatternDetector {
  getId() {
    return 'deepChains';
  }
  
  getName() {
    return 'Deep Dependency Chains';
  }
  
  getDescription() {
    return 'Detects dependency chains deeper than 7 levels with high coupling';
  }
  
  async detect(systemMap) {
    const config = this.config;
    const minDepth = config.minDepth || 7;
    const maxAcceptable = config.maxAcceptable || 20;
    
    const findings = [];
    const visited = new Set();
    
    // Encontrar entry points reales (funciones que inician flujos)
    const entryPoints = this.findEntryPoints(systemMap);
    
    logger.debug(`Analyzing ${entryPoints.length} entry points for deep chains`);
    
    for (const entry of entryPoints) {
      if (visited.has(entry.id)) continue;
      
      const chain = this.buildChain(entry.id, [entry.id], systemMap, minDepth + 3);
      const riskScore = this.calculateRiskScore(chain, entry, systemMap);
      
      // Solo reportar si es realmente problemático
      if (chain.length >= minDepth && riskScore >= 20) {
        findings.push({
          id: `deep-chain-${entry.id}`,
          type: 'deep_dependency_chain',
          severity: riskScore >= 50 ? 'high' : 'medium',
          file: entry.file,
          line: entry.line,
          message: `Deep chain: ${chain.length} levels from ${entry.name}`,
          recommendation: `Consider breaking chain at level ${Math.floor(chain.length / 2)}`,
          metadata: {
            chainLength: chain.length,
            chain: chain.slice(0, 10), // Limitar a 10 para no saturar
            riskScore,
            entryPoint: entry.name,
            fanIn: entry.fanIn,
            fanOut: entry.fanOut
          }
        });
      }
      
      visited.add(entry.id);
    }
    
    // Calcular score basado en cantidad y severidad
    const score = this.calculateScore(findings, maxAcceptable);
    
    return {
      detector: this.getId(),
      name: this.getName(),
      description: this.getDescription(),
      findings,
      score,
      weight: this.globalConfig.weights?.deepChains || 0.15,
      recommendation: findings.length > 0 
        ? `Found ${findings.length} deep chains (${findings.filter(f => f.severity === 'high').length} high risk)`
        : 'No problematic deep chains detected'
    };
  }
  
  /**
   * Encuentra entry points reales (no todas las funciones sin incoming)
   */
  findEntryPoints(systemMap) {
    const entryPoints = [];
    const links = systemMap.function_links || [];
    
    // Agrupar links por función
    const functionStats = {};
    
    links.forEach(link => {
      if (!functionStats[link.from]) {
        functionStats[link.from] = { outgoing: 0, incoming: 0, file: link.fromFile };
      }
      if (!functionStats[link.to]) {
        functionStats[link.to] = { outgoing: 0, incoming: 0, file: link.toFile };
      }
      functionStats[link.from].outgoing++;
      functionStats[link.to].incoming++;
    });
    
    // Entry point real: pocos incoming pero varios outgoing (no hojas)
    Object.entries(functionStats).forEach(([funcId, stats]) => {
      if (stats.incoming <= 1 && stats.outgoing >= 2) {
        entryPoints.push({
          id: funcId,
          name: funcId.split('::').pop(),
          file: stats.file,
          fanIn: stats.incoming,
          fanOut: stats.outgoing
        });
      }
    });
    
    return entryPoints;
  }
  
  /**
   * Construye cadena desde un entry point (solo la rama más larga)
   */
  buildChain(currentId, path, systemMap, maxDepth) {
    if (path.length >= maxDepth) return path;
    
    const outgoing = (systemMap.function_links || [])
      .filter(link => link.from === currentId && !path.includes(link.to));
    
    if (outgoing.length === 0) return path;
    
    // Estrategia: seguir solo la rama más larga para evitar explosión
    // En una versión avanzada, podríamos seguir las N ramas más largas
    let longestPath = path;
    
    for (const link of outgoing.slice(0, 3)) { // Limitar a 3 ramas
      const subPath = this.buildChain(link.to, [...path, link.to], systemMap, maxDepth);
      if (subPath.length > longestPath.length) {
        longestPath = subPath;
      }
    }
    
    return longestPath;
  }
  
  /**
   * Calcula score de riesgo de una cadena
   */
  calculateRiskScore(chain, entry, systemMap) {
    let score = 0;
    
    // Factor 1: Profundidad (cuadrática)
    const depth = chain.length;
    const minDepth = this.config.minDepth || 7;
    if (depth > minDepth) {
      score += Math.pow(depth - minDepth, 2);
    }
    
    // Factor 2: Fan-in del entry point
    if (entry.fanIn > 3) {
      score += (entry.fanIn - 3) * 5;
    }
    
    // Factor 3: Fan-out (si depende de muchas cosas)
    if (entry.fanOut > 5) {
      score += (entry.fanOut - 5) * 3;
    }
    
    return score;
  }
  
  calculateScore(findings, maxAcceptable) {
    if (findings.length === 0) return 100;
    
    const highRiskCount = findings.filter(f => f.severity === 'high').length;
    
    // Penalizar exponencialmente por cantidad de cadenas de alto riesgo
    if (highRiskCount > maxAcceptable) {
      return Math.max(0, 100 - (highRiskCount - maxAcceptable) * 5);
    }
    
    // Penalización leve por cadenas medium
    const mediumRiskCount = findings.filter(f => f.severity === 'medium').length;
    return Math.max(50, 100 - highRiskCount * 5 - mediumRiskCount * 2);
  }
}

export default DeepChainsDetector;
