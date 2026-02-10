/**
 * @fileoverview Metadata Enhancer - Enriquecimiento a nivel de átomo
 * 
 * Este enhancer agrega cálculos y validaciones a los metadatos
 * de cada átomo individual (sin cross-reference).
 * 
 * @module pipeline/enhancers/metadata-enhancer
 */

import { createLogger } from '../../../utils/logger.js';
import { validateForLineage } from '../../../layer-b-semantic/validators/lineage-validator.js';

const logger = createLogger('OmnySys:pipeline:metadata-enhancer');

/**
 * Enriquece metadatos de cada átomo
 * 
 * @param {Object} context - Contexto del pipeline
 * @returns {Object} Contexto con metadatos enriquecidos
 */
export async function enhanceMetadata(context) {
  const { atoms } = context;
  
  for (const atom of atoms) {
    // 1. Validación de lineage (si tiene DNA)
    if (atom.dna) {
      const validation = validateForLineage(atom);
      atom._meta = atom._meta || {};
      atom._meta.validation = {
        valid: validation.valid,
        confidence: validation.confidence,
        checkedAt: new Date().toISOString()
      };
    }
    
    // 2. Calcular métricas derivadas
    atom.metrics = calculateDerivedMetrics(atom);
    
    // 3. Enriquecer con contexto temporal (sin cross-reference)
    if (atom.temporal?.patterns) {
      atom.temporal.summary = summarizeTemporalPatterns(atom.temporal.patterns);
    }
  }
  
  return context;
}

/**
 * Calcula métricas derivadas del átomo
 */
function calculateDerivedMetrics(atom) {
  const metrics = {
    // Densidad de conexiones
    connectionDensity: calculateConnectionDensity(atom),
    
    // Complejidad normalizada (0-1)
    normalizedComplexity: Math.min(atom.complexity / 20, 1),
    
    // Ratio de side effects
    sideEffectRatio: calculateSideEffectRatio(atom),
    
    // Cobertura de data flow
    dataFlowCoverage: atom.dataFlowAnalysis?.coverage || 0
  };
  
  // Calcular "criticidad"
  metrics.criticalityScore = calculateCriticalityScore(atom, metrics);
  
  return metrics;
}

/**
 * Calcula densidad de conexiones
 */
function calculateConnectionDensity(atom) {
  let connections = 0;
  
  // Llamadas
  connections += (atom.calls?.length || 0);
  connections += (atom.calledBy?.length || 0);
  
  // Conexiones semánticas
  connections += (atom.semanticConnections?.length || 0);
  
  // Normalizar por LOC
  const loc = atom.linesOfCode || 1;
  return Math.min(connections / Math.sqrt(loc), 1);
}

/**
 * Calcula ratio de side effects
 */
function calculateSideEffectRatio(atom) {
  const totalIndicators = [
    atom.hasNetworkCalls,
    atom.hasDomManipulation,
    atom.hasStorageAccess,
    atom.hasLogging,
    atom.hasSideEffects
  ].filter(Boolean).length;
  
  return totalIndicators / 5;
}

/**
 * Calcula score de criticidad
 */
function calculateCriticalityScore(atom, metrics) {
  let score = 0;
  
  // Exportada = más crítica
  if (atom.isExported) score += 0.2;
  
  // Muchos dependents = más crítica
  const dependents = atom.calledBy?.length || 0;
  score += Math.min(dependents / 10, 0.3);
  
  // Alta complejidad = más crítica
  score += metrics.normalizedComplexity * 0.2;
  
  // Side effects = más crítica
  score += metrics.sideEffectRatio * 0.2;
  
  // Data flow completo = menos crítico (mejor diseño)
  score -= metrics.dataFlowCoverage * 0.1;
  
  return Math.max(0, Math.min(score, 1));
}

/**
 * Resume patrones temporales
 */
function summarizeTemporalPatterns(patterns) {
  return {
    isInitializer: patterns.initialization?.length > 0,
    hasLifecycle: patterns.lifecycleHooks?.length > 0,
    hasTimers: patterns.timers?.length > 0,
    isAsync: patterns.asyncPatterns?.isAsync,
    hasParallelOps: patterns.asyncPatterns?.parallelOperations?.length > 0,
    executionOrder: patterns.executionOrder
  };
}
