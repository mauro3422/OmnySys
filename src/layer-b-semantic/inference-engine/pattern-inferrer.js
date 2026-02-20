/**
 * @fileoverview Pattern Inferrer
 * 
 * Deducir patrones de código desde metadatos SIN usar LLM.
 * 
 * Principio: "Si ves vallas alrededor de una casa, deduces que hay vecinos"
 * 
 * @module inference-engine/pattern-inferrer
 */

import { detectAPIPattern } from './detectors/api-detector.js';
import { detectDataLayer } from './detectors/data-layer-detector.js';
import { detectCoupling } from './detectors/coupling-detector.js';

/**
 * Clase principal para inferencia de patrones
 */
export class PatternInferrer {
  constructor() {
    this.detectors = [
      { name: 'api', detect: detectAPIPattern },
      { name: 'dataLayer', detect: detectDataLayer },
      { name: 'coupling', detect: detectCoupling }
    ];
  }

  /**
   * Inferir todos los patrones de un archivo
   * 
   * @param {Object} fileAnalysis - Análisis del archivo
   * @returns {Object} Patrones detectados
   */
  infer(fileAnalysis) {
    const patterns = {
      detected: [],
      confidence: {},
      evidence: {}
    };

    for (const { name, detect } of this.detectors) {
      const result = detect(fileAnalysis);
      if (result.detected) {
        patterns.detected.push(name);
        patterns.confidence[name] = result.confidence;
        patterns.evidence[name] = result.evidence;
      }
    }

    // Inferencias adicionales basadas en combinaciones
    patterns.detected.push(...this._inferFromCombinations(fileAnalysis, patterns));

    return patterns;
  }

  /**
   * Inferencias basadas en combinaciones de patrones
   * 
   * @private
   */
  _inferFromCombinations(fileAnalysis, patterns) {
    const additional = [];

    // Si tiene API + Storage → probablemente es un backend/service
    if (patterns.detected.includes('api') && 
        this._hasStorageAccess(fileAnalysis)) {
      additional.push('backend-service');
    }

    // Si tiene muchos imports + pocos exports → probablemente es un orchestrator
    const imports = fileAnalysis.imports?.length || 0;
    const exports = fileAnalysis.exports?.length || 0;
    if (imports > 5 && exports <= 2) {
      additional.push('orchestrator');
    }

    // Si tiene eventos + sin callers directos → event handler
    const hasEvents = fileAnalysis.atoms?.some(a => 
      a.sideEffects?.some(s => s.category === 'event')
    );
    const hasCallers = (fileAnalysis.usedBy?.length || 0) > 0;
    if (hasEvents && !hasCallers) {
      additional.push('event-handler');
    }

    return additional;
  }

  _hasStorageAccess(fileAnalysis) {
    return fileAnalysis.atoms?.some(a => 
      a.sideEffects?.some(s => s.category === 'storage')
    ) || false;
  }
}

export default PatternInferrer;