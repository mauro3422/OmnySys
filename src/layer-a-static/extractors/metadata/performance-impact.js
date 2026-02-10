/**
 * @fileoverview Performance Impact Extractor
 * 
 * Propaga impactos de performance entre funciones.
 * Detecta "cables de performance": si A es lento y B llama a A, B también es lento.
 * 
 * @module layer-a-static/extractors/metadata/performance-impact
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:extractors:performance-impact');

/**
 * Extrae métricas de performance de una función
 * 
 * @param {string} code - Código fuente
 * @param {Object} performanceHints - Hints existentes
 * @returns {Object} Métricas de performance
 */
export function extractPerformanceMetrics(code, performanceHints = {}) {
  const metrics = {
    // Complejidad computacional
    complexity: {
      cyclomatic: 0,
      cognitive: 0,
      bigO: 'O(1)'
    },
    
    // Operaciones costosas
    expensiveOps: {
      nestedLoops: 0,
      recursion: false,
      blockingOps: [],
      heavyCalls: []
    },
    
    // Recursos
    resources: {
      network: false,
      disk: false,
      memory: 'low', // 'low', 'medium', 'high'
      dom: false
    },
    
    // Estimaciones
    estimates: {
      executionTime: 'instant', // 'instant', 'fast', 'medium', 'slow'
      blocking: false,
      async: false
    },
    
    // Score agregado (0-1)
    impactScore: 0
  };
  
  try {
    // Usar hints existentes
    if (performanceHints) {
      metrics.expensiveOps.nestedLoops = performanceHints.nestedLoops?.length || 0;
      metrics.expensiveOps.recursion = performanceHints.hasRecursion || false;
      metrics.expensiveOps.blockingOps = performanceHints.blockingOperations || [];
    }
    
    // Analizar complejidad
    metrics.complexity = analyzeComplexity(code);
    
    // Detectar operaciones costosas adicionales
    detectExpensiveOperations(code, metrics);
    
    // Estimar recursos
    estimateResourceUsage(code, metrics);
    
    // Calcular score final
    metrics.impactScore = calculateImpactScore(metrics);
    metrics.estimates = estimateExecution(metrics);
    
  } catch (error) {
    logger.warn('Failed to extract performance metrics:', error.message);
  }
  
  return metrics;
}

/**
 * Analiza complejidad del código
 */
function analyzeComplexity(code) {
  let cyclomatic = 1;
  let nestingDepth = 0;
  let maxNesting = 0;
  
  const patterns = [
    { pattern: /\bif\s*\(/g, weight: 1 },
    { pattern: /\belse\s+if\s*\(/g, weight: 1 },
    { pattern: /\bfor\s*\(/g, weight: 1 },
    { pattern: /\bwhile\s*\(/g, weight: 1 },
    { pattern: /\bcase\s+/g, weight: 1 },
    { pattern: /\bcatch\s*\(/g, weight: 1 },
    { pattern: /\?\s*[^?:]+\s*:/g, weight: 1 },
    { pattern: /&&|\|\|/g, weight: 0.5 }
  ];
  
  for (const { pattern, weight } of patterns) {
    const matches = code.match(pattern) || [];
    cyclomatic += matches.length * weight;
  }
  
  // Calcular nesting máximo
  const lines = code.split('\n');
  for (const line of lines) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    nestingDepth += openBraces - closeBraces;
    maxNesting = Math.max(maxNesting, nestingDepth);
  }
  
  // Determinar Big O
  let bigO = 'O(1)';
  
  const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/.test(code);
  const hasRecursiveCalls = /function\s+(\w+).*\{[^}]*\1\s*\(/.test(code);
  const hasWhileTrue = /while\s*\(\s*true\s*\)/.test(code);
  
  if (hasRecursiveCalls) {
    bigO = 'O(2^n)'; // Asumir peor caso para recursión
  } else if (hasNestedLoops) {
    bigO = 'O(n^2)';
  } else if (/\bfor\s*\(/.test(code) || /\bwhile\s*\(/.test(code)) {
    bigO = 'O(n)';
  }
  
  return {
    cyclomatic: Math.round(cyclomatic),
    cognitive: maxNesting,
    bigO
  };
}

/**
 * Detecta operaciones costosas
 */
function detectExpensiveOperations(code, metrics) {
  // Operaciones de array grandes
  const arrayOps = [
    { pattern: /\.map\s*\(/, name: 'Array.map', cost: 'medium' },
    { pattern: /\.filter\s*\(/, name: 'Array.filter', cost: 'medium' },
    { pattern: /\.reduce\s*\(/, name: 'Array.reduce', cost: 'medium' },
    { pattern: /\.sort\s*\(/, name: 'Array.sort', cost: 'high' },
    { pattern: /\.flat\s*\(/, name: 'Array.flat', cost: 'high' },
    { pattern: /\.find\s*\(/, name: 'Array.find', cost: 'low' }
  ];
  
  for (const { pattern, name, cost } of arrayOps) {
    const matches = code.match(pattern);
    if (matches) {
      metrics.expensiveOps.heavyCalls.push({
        operation: name,
        cost,
        count: matches.length
      });
    }
  }
  
  // JSON operaciones grandes
  if (/JSON\.parse\s*\(|JSON\.stringify\s*\(/.test(code)) {
    // Verificar si parece grande (objeto complejo)
    const context = code.match(/JSON\.(parse|stringify)\s*\([^)]+/);
    if (context && context[0].length > 50) {
      metrics.expensiveOps.heavyCalls.push({
        operation: 'JSON.parse/stringify (large)',
        cost: 'high'
      });
    }
  }
  
  // DOM operations costosas
  const domOps = [
    { pattern: /querySelectorAll\s*\(/, name: 'querySelectorAll' },
    { pattern: /getElementsByTagName\s*\(/, name: 'getElementsByTagName' },
    { pattern: /innerHTML\s*=/, name: 'innerHTML write' },
    { pattern: /appendChild\s*\(/, name: 'appendChild loop' }
  ];
  
  for (const { pattern, name } of domOps) {
    if (pattern.test(code)) {
      metrics.resources.dom = true;
      metrics.expensiveOps.heavyCalls.push({
        operation: name,
        cost: 'medium'
      });
    }
  }
}

/**
 * Estima uso de recursos
 */
function estimateResourceUsage(code, metrics) {
  // Network
  if (/fetch\s*\(|axios\.|request\.|XMLHttpRequest/.test(code)) {
    metrics.resources.network = true;
    metrics.estimates.async = true;
  }
  
  // Disk
  if (/localStorage|sessionStorage|indexedDB|fs\./.test(code)) {
    metrics.resources.disk = true;
  }
  
  // Memory
  const memoryPatterns = [
    { pattern: /new\s+Array\s*\(\s*\d{4,}/, level: 'high' },
    { pattern: /new\s+(?:Image|Blob|File)\s*\(/, level: 'medium' },
    { pattern: /Buffer\.(?:alloc|from)\s*\(/, level: 'medium' },
    { pattern: /createCanvas|getContext\s*\(\s*['"]2d['"]/, level: 'high' }
  ];
  
  for (const { pattern, level } of memoryPatterns) {
    if (pattern.test(code)) {
      metrics.resources.memory = level;
    }
  }
  
  // Caché de resultados (indica operación costosa)
  if (/memoize|cache|lazy/.test(code)) {
    metrics.estimates.expensiveWithCache = true;
  }
}

/**
 * Calcula score de impacto agregado
 */
function calculateImpactScore(metrics) {
  let score = 0;
  
  // Complejidad
  if (metrics.complexity.cyclomatic > 10) score += 0.2;
  if (metrics.complexity.cyclomatic > 20) score += 0.2;
  if (metrics.complexity.bigO === 'O(n^2)') score += 0.2;
  if (metrics.complexity.bigO === 'O(2^n)') score += 0.4;
  
  // Operaciones costosas
  score += Math.min(metrics.expensiveOps.nestedLoops * 0.1, 0.3);
  if (metrics.expensiveOps.recursion) score += 0.2;
  score += Math.min(metrics.expensiveOps.heavyCalls.length * 0.05, 0.2);
  
  // Recursos
  if (metrics.resources.network) score += 0.15;
  if (metrics.resources.memory === 'high') score += 0.15;
  if (metrics.resources.dom) score += 0.1;
  
  return Math.min(score, 1);
}

/**
 * Estima tiempo de ejecución
 */
function estimateExecution(metrics) {
  if (metrics.impactScore > 0.7) {
    return {
      executionTime: 'slow',
      blocking: true,
      async: metrics.resources.network
    };
  }
  
  if (metrics.impactScore > 0.4) {
    return {
      executionTime: 'medium',
      blocking: !metrics.resources.network,
      async: metrics.resources.network
    };
  }
  
  if (metrics.impactScore > 0.2) {
    return {
      executionTime: 'fast',
      blocking: false,
      async: false
    };
  }
  
  return {
    executionTime: 'instant',
    blocking: false,
    async: false
  };
}

/**
 * Propaga impactos de performance entre átomos
 * 
 * @param {Array} atoms - Todos los átomos
 * @returns {Array} Conexiones de performance
 */
export function extractPerformanceImpactConnections(atoms) {
  const connections = [];
  
  // Indexar por nivel de impacto
  const impactLevels = {
    critical: [],  // score > 0.7
    high: [],      // score > 0.5
    medium: []     // score > 0.3
  };
  
  for (const atom of atoms) {
    const score = atom.performance?.impactScore || 0;
    
    if (score > 0.7) {
      impactLevels.critical.push(atom);
    } else if (score > 0.5) {
      impactLevels.high.push(atom);
    } else if (score > 0.3) {
      impactLevels.medium.push(atom);
    }
  }
  
  // Para cada átomo, ver si llama a funciones lentas
  for (const atom of atoms) {
    const calls = atom.calls || [];
    
    for (const call of calls) {
      // Buscar en todos los niveles de impacto
      for (const [level, slowAtoms] of Object.entries(impactLevels)) {
        const target = slowAtoms.find(a => 
          call.includes(a.name) || call.includes(a.id)
        );
        
        if (target && target.id !== atom.id) {
          // Calcular impacto propagado
          const propagatedImpact = calculatePropagatedImpact(
            atom.performance,
            target.performance
          );
          
          connections.push({
            type: 'performance-impact',
            from: target.id,
            to: atom.id,
            impact: {
              sourceLevel: level,
              sourceScore: target.performance.impactScore,
              propagatedScore: propagatedImpact.score,
              severity: propagatedImpact.severity
            },
            reason: generateImpactReason(target, atom),
            confidence: 0.75,
            warning: propagatedImpact.severity === 'high'
          });
        }
      }
    }
  }
  
  // Detectar cadenas críticas (A→B→C donde todos son lentos)
  const criticalChains = detectCriticalChains(connections);
  
  return [...connections, ...criticalChains];
}

/**
 * Calcula impacto propagado
 */
function calculatePropagatedImpact(callerPerf, calleePerf) {
  const baseScore = calleePerf?.impactScore || 0;
  const callerScore = callerPerf?.impactScore || 0;
  
  // El impacto se suma (aproximadamente)
  const propagatedScore = Math.min(baseScore + callerScore * 0.5, 1);
  
  let severity = 'low';
  if (propagatedScore > 0.7) severity = 'critical';
  else if (propagatedScore > 0.5) severity = 'high';
  else if (propagatedScore > 0.3) severity = 'medium';
  
  return { score: propagatedScore, severity };
}

/**
 * Genera descripción del impacto
 */
function generateImpactReason(slowFunction, caller) {
  const reasons = [];
  
  if (slowFunction.performance?.resources?.network) {
    reasons.push('network call');
  }
  
  if (slowFunction.performance?.complexity?.bigO !== 'O(1)') {
    reasons.push(`complexity ${slowFunction.performance.complexity.bigO}`);
  }
  
  if (slowFunction.performance?.expensiveOps?.nestedLoops > 0) {
    reasons.push('nested loops');
  }
  
  return `${caller.name} calls ${slowFunction.name} which has: ${reasons.join(', ')}`;
}

/**
 * Detecta cadenas críticas de performance
 */
function detectCriticalChains(connections) {
  const chains = [];
  
  // Grafo de impactos
  const graph = new Map();
  
  for (const conn of connections) {
    if (conn.impact.severity === 'high' || conn.impact.severity === 'critical') {
      if (!graph.has(conn.to)) {
        graph.set(conn.to, []);
      }
      graph.get(conn.to).push(conn.from);
    }
  }
  
  // Encontrar cadenas (A→B→C)
  for (const [node, sources] of graph) {
    for (const source of sources) {
      // Ver si source también es target de alguien más
      if (graph.has(source)) {
        const grandSources = graph.get(source);
        
        for (const grandSource of grandSources) {
          chains.push({
            type: 'performance-chain',
            chain: [grandSource, source, node],
            severity: 'critical',
            message: `Critical performance chain: ${grandSource} → ${source} → ${node}`,
            recommendation: 'Consider parallel execution or caching'
          });
        }
      }
    }
  }
  
  return chains;
}
