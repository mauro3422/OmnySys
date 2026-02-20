/**
 * @fileoverview Inference Engine - Entry Point
 * 
 * Motor de inferencia sin LLM que deduce patrones y relaciones
 * a partir de los metadatos extraídos por Layer A.
 * 
 * PRINCIPIO: "Deducir desde evidencia, no adivinar con LLM"
 * 
 * @module inference-engine
 * @version 1.0.0
 */

export { PatternInferrer } from './pattern-inferrer.js';
export { RelationshipAnalyzer } from './relationship-analyzer.js';
export { RiskScorer } from './risk-scorer.js';

// Re-export detectors
export { detectAPIPattern } from './detectors/api-detector.js';
export { detectDataLayer } from './detectors/data-layer-detector.js';
export { detectCoupling } from './detectors/coupling-detector.js';
export { analyzeNeighborhood } from './detectors/neighborhood.js';

// Importar para usar localmente
import { PatternInferrer } from './pattern-inferrer.js';
import { RelationshipAnalyzer } from './relationship-analyzer.js';
import { RiskScorer } from './risk-scorer.js';

/**
 * Analiza un archivo completo y devuelve todas las inferencias
 * 
 * @param {Object} fileAnalysis - Análisis del archivo de Layer A
 * @param {Map} allFiles - Mapa de todos los archivos del proyecto (para contexto)
 * @returns {Object} Inferencias completas
 */
export function inferFromFile(fileAnalysis, allFiles = new Map()) {
  const patternInferrer = new PatternInferrer();
  const relationshipAnalyzer = new RelationshipAnalyzer();
  const riskScorer = new RiskScorer();
  
  return {
    patterns: patternInferrer.infer(fileAnalysis),
    relationships: relationshipAnalyzer.analyze(fileAnalysis, allFiles),
    risk: riskScorer.score(fileAnalysis),
    timestamp: new Date().toISOString()
  };
}

export default {
  PatternInferrer,
  RelationshipAnalyzer,
  RiskScorer,
  inferFromFile
};
