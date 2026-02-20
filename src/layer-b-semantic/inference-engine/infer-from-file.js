/**
 * @fileoverview Infer From File - Convenience Function
 * 
 * Función de conveniencia para inferir todo desde un archivo
 * 
 * @module inference-engine/infer-from-file
 */

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
    filePath: fileAnalysis.filePath || '',
    patterns: patternInferrer.infer(fileAnalysis),
    relationships: relationshipAnalyzer.analyze(fileAnalysis, allFiles),
    risk: riskScorer.score(fileAnalysis),
    timestamp: new Date().toISOString(),
    
    // Metadata sobre la inferencia
    _meta: {
      engineVersion: '1.0.0',
      usedLLM: false  // Esta función NUNCA usa LLM
    }
  };
}

export default inferFromFile;