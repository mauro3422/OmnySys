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
  }

  /**
   * Calcula el score de riesgo de un archivo
   * 
   * @param {Object} fileAnalysis - Análisis del archivo
   * @returns {Object} Score de riesgo con desglose
   */
  score(fileAnalysis) {
    const factors = {
      complexity: this._scoreComplexity(fileAnalysis),
      coupling: this._scoreCoupling(fileAnalysis),
      errorHandling: this._scoreErrorHandling(fileAnalysis),
      testCoverage: this._scoreTestCoverage(fileAnalysis),
      churnRate: this._scoreChurnRate(fileAnalysis),
      sideEffects: this._scoreSideEffects(fileAnalysis)
    };

    // Calcular score total ponderado
    let total = 0;
    for (const [factor, value] of Object.entries(factors)) {
      total += value * (this.weights[factor] || 0);
    }

    // Determinar nivel de riesgo
    const level = this._determineLevel(total);

    // Generar recomendaciones
    const recommendations = this._generateRecommendations(factors, fileAnalysis);

    return {
      score: Math.round(total * 100) / 100,
      level,
      factors,
      recommendations
    };
  }

  /**
   * @private - Score de complejidad (0-1, más alto = más riesgo)
   */
  _scoreComplexity(fileAnalysis) {
    const atoms = fileAnalysis.atoms || [];
    if (atoms.length === 0) return 0.1;

    // Promedio de complejidad de átomos
    const avgComplexity = atoms.reduce((sum, a) => 
      sum + (a.complexity?.cyclomatic || 1), 0) / atoms.length;

    // Normalizar: complejidad 1-5 = bajo, 6-10 = medio, >10 = alto
    if (avgComplexity <= 5) return 0.2;
    if (avgComplexity <= 10) return 0.5;
    return 0.8;
  }

  /**
   * @private - Score de acoplamiento (0-1)
   */
  _scoreCoupling(fileAnalysis) {
    const incoming = fileAnalysis.usedBy?.length || 0;
    const outgoing = fileAnalysis.imports?.length || 0;

    // Muchas dependencias entrantes = alto riesgo (si se rompe, rompe mucho)
    // Muchas dependencias salientes = medio riesgo (depende de mucho)
    
    const incomingRisk = Math.min(1, incoming / 10);
    const outgoingRisk = Math.min(0.5, outgoing / 20);

    return (incomingRisk * 0.7) + (outgoingRisk * 0.3);
  }

  /**
   * @private - Score de manejo de errores (0-1, más alto = MÁS riesgo si NO tiene)
   */
  _scoreErrorHandling(fileAnalysis) {
    const atoms = fileAnalysis.atoms || [];
    if (atoms.length === 0) return 0.1;

    // Verificar si tiene network calls sin error handling
    const hasNetworkCalls = atoms.some(a => a.hasNetworkCalls);
    const hasErrorHandling = atoms.some(a => a.hasErrorHandling);

    // Si tiene network calls pero no error handling = alto riesgo
    if (hasNetworkCalls && !hasErrorHandling) return 0.9;

    // Si no tiene network calls, el riesgo es bajo
    if (!hasNetworkCalls) return 0.1;

    // Si tiene network calls y error handling = bajo riesgo
    return 0.2;
  }

  /**
   * @private - Score de cobertura de tests (0-1)
   */
  _scoreTestCoverage(fileAnalysis) {
    const filePath = fileAnalysis.filePath || '';
    
    // Archivos de test no necesitan test coverage
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 0;
    }

    // Por ahora, score neutral hasta que tengamos datos reales de coverage
    // TODO: Integrar con datos de coverage real
    return 0.5;
  }

  /**
   * @private - Score de churn rate (0-1)
   */
  _scoreChurnRate(fileAnalysis) {
    // TODO: Integrar con git history
    // Por ahora, score neutral
    const churn = fileAnalysis.metadata?.historical?.churnRate || 0;
    
    if (churn === 0) return 0.3;
    if (churn < 5) return 0.2;
    if (churn < 20) return 0.5;
    return 0.8;
  }

  /**
   * @private - Score de side effects (0-1)
   */
  _scoreSideEffects(fileAnalysis) {
    const atoms = fileAnalysis.atoms || [];
    if (atoms.length === 0) return 0;

    const sideEffectCount = atoms.filter(a => a.hasSideEffects).length;
    const ratio = sideEffectCount / atoms.length;

    // Más side effects = más riesgo
    return ratio;
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

  /**
   * @private - Genera recomendaciones
   */
  _generateRecommendations(factors, fileAnalysis) {
    const recommendations = [];

    if (factors.complexity > 0.6) {
      recommendations.push({
        type: 'refactor',
        message: 'Considerar refactorizar funciones complejas',
        priority: 'medium'
      });
    }

    if (factors.coupling > 0.6) {
      recommendations.push({
        type: 'architecture',
        message: 'Alto acoplamiento - considerar desacoplar',
        priority: 'high'
      });
    }

    if (factors.errorHandling > 0.7) {
      recommendations.push({
        type: 'reliability',
        message: 'Agregar manejo de errores para operaciones de red',
        priority: 'critical'
      });
    }

    if (factors.sideEffects > 0.5) {
      recommendations.push({
        type: 'purity',
        message: 'Muchos side effects - considerar funciones puras',
        priority: 'low'
      });
    }

    return recommendations;
  }
}

export default RiskScorer;