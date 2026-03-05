/**
 * @fileoverview Risk Scorer
 * 
 * Calcula el riesgo de un archivo basándose en metadatos SIN LLM.
 * 
 * Principio: "El riesgo emerge de patrones, no de adivinanzas"
 * 
 * @module inference-engine/risk-scorer
 */

/**
 * Scorer de riesgo
 */
import {
  ComplexityStrategy,
  CouplingStrategy,
  ErrorHandlerStrategy,
  TestCoverageStrategy,
  ChurnRateStrategy,
  SideEffectStrategy,
  RecommendationEngine
} from './strategies/index.js';

/**
 * Scorer de riesgo
 */
export class RiskScorer {
  constructor() {
    // Pesos para cada factor de riesgo
    this.weights = {
      complexity: 0.20,
      coupling: 0.25,
      errorHandling: 0.20,
      testCoverage: 0.15,
      churnRate: 0.10,
      sideEffects: 0.10
    };

    // Estrategias especializadas
    this.strategies = {
      complexity: new ComplexityStrategy(),
      coupling: new CouplingStrategy(),
      errorHandling: new ErrorHandlerStrategy(),
      testCoverage: new TestCoverageStrategy(),
      churnRate: new ChurnRateStrategy(),
      sideEffects: new SideEffectStrategy()
    };

    this.recommendationEngine = new RecommendationEngine();
  }

  /**
   * Calcula el score de riesgo de un archivo
   * 
   * @param {Object} fileAnalysis - Análisis del archivo
   * @returns {Object} Score de riesgo con desglose
   */
  score(fileAnalysis) {
    const factors = {};

    // Ejecutar cada estrategia
    for (const [key, strategy] of Object.entries(this.strategies)) {
      factors[key] = strategy.score(fileAnalysis);
    }

    // Calcular score total ponderado
    let total = 0;
    for (const [factor, value] of Object.entries(factors)) {
      total += value * (this.weights[factor] || 0);
    }

    // Determinar nivel de riesgo
    const level = this._determineLevel(total);

    // Generar recomendaciones
    const recommendations = this.recommendationEngine.generate(factors, fileAnalysis);

    return {
      score: Math.round(total * 100) / 100,
      level,
      factors,
      recommendations
    };
  }

  /**
   * @private - Determina nivel de riesgo
   */
  _determineLevel(score) {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'critical';
  }
}


export default RiskScorer;