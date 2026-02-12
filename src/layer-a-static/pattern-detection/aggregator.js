/**
 * @fileoverview Quality Score Aggregator
 * 
 * Agrega scores de múltiples detectores en un score global.
 * Usa ponderación configurable.
 * 
 * @module pattern-detection/aggregator
 */

// Simple logger para evitar dependencias circulares
const logger = {
  info: (msg, ...args) => console.log(`[Aggregator] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Aggregator] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Aggregator] ${msg}`, ...args),
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[Aggregator] ${msg}`, ...args)
};

export class QualityScoreAggregator {
  constructor(config = {}) {
    this.config = config;
    this.weights = config.weights || {};
  }
  
  /**
   * Calcula score global a partir de resultados individuales
   * 
   * @param {Array<DetectionResult>} results - Resultados de detectores
   * @returns {QualityScore} - Score calculado
   */
  calculate(results) {
    if (!results || results.length === 0) {
      return this.createEmptyScore();
    }
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const breakdown = {};
    
    results.forEach(result => {
      const weight = this.weights[result.detector] || 
                     this.weights[result.name] || 
                     (1 / results.length); // Distribuir equitativamente si no hay peso
      
      const score = result.score || 100;
      totalWeightedScore += score * weight;
      totalWeight += weight;
      
      breakdown[result.detector || result.name] = {
        score,
        weight,
        contribution: score * weight,
        findings: result.findings?.length || 0
      };
    });
    
    const finalScore = totalWeight > 0 
      ? Math.round(totalWeightedScore / totalWeight)
      : 100;
    
    const grade = this.calculateGrade(finalScore);
    
    return {
      score: finalScore,
      grade,
      totalIssues: results.reduce((sum, r) => sum + (r.findings?.length || 0), 0),
      breakdown,
      recommendations: this.generateRecommendations(results),
      weights: this.weights
    };
  }
  
  /**
   * Calcula grade basado en score
   */
  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * Genera recomendaciones basadas en findings
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    // Encontrar los 3 peores scores
    const sortedByScore = [...results]
      .sort((a, b) => (a.score || 100) - (b.score || 100))
      .slice(0, 3);
    
    sortedByScore.forEach(result => {
      if (result.score < 80) {
        recommendations.push({
          priority: result.score < 50 ? 'high' : 'medium',
          category: result.name || result.detector,
          message: result.recommendation || `${result.findings?.length || 0} issues found`,
          score: result.score
        });
      }
    });
    
    return recommendations;
  }
  
  /**
   * Crea score vacío (para cuando no hay resultados)
   */
  createEmptyScore() {
    return {
      score: 100,
      grade: 'A',
      totalIssues: 0,
      breakdown: {},
      recommendations: ['No analysis results available'],
      weights: this.weights
    };
  }
  
  /**
   * Ajusta pesos dinámicamente basado en tipo de proyecto
   */
  adjustWeightsForProjectType(projectType) {
    const adjustments = {
      microservices: {
        coupling: 0.25,           // Más importante en microservicios
        circularDeps: 0.20,       // Crítico
        sharedObjects: 0.10,      // Menos importante (cada servicio tiene su estado)
      },
      library: {
        unusedExports: 0.20,      // Muy importante (API pública)
        circularDeps: 0.10,       // Menos crítico
        sharedObjects: 0.05,      // Librerías no deben tener estado
      },
      standard: {
        // Usar defaults
      }
    };
    
    if (adjustments[projectType]) {
      this.weights = { ...this.weights, ...adjustments[projectType] };
      logger.info(`Weights adjusted for ${projectType} project`);
    }
  }
}

export default QualityScoreAggregator;
