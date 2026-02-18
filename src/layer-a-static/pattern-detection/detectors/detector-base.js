/**
 * @fileoverview detector-base.js
 *
 * Clase base para todos los detectores de patrones.
 * Define la interfaz común que deben implementar los detectores concretos.
 *
 * @module layer-a-static/pattern-detection/detectors/detector-base
 * @phase Layer A (Static Extraction)
 */

/**
 * Base class para detectores de patrones.
 * Los detectores concretos extienden esta clase e implementan:
 * - getId(): string
 * - getName(): string
 * - getDescription(): string
 * - detect(systemMap): Promise<DetectionResult>
 */
export class PatternDetector {
  /**
   * @param {Object} config - Configuración específica del detector
   * @param {Object} globalConfig - Configuración global del sistema
   */
  constructor(config = {}, globalConfig = {}) {
    this.config = config;
    this.globalConfig = globalConfig;
  }

  /**
   * Identificador único del detector.
   * @returns {string}
   */
  getId() {
    throw new Error(`${this.constructor.name} must implement getId()`);
  }

  /**
   * Nombre legible del detector.
   * @returns {string}
   */
  getName() {
    throw new Error(`${this.constructor.name} must implement getName()`);
  }

  /**
   * Descripción de qué detecta.
   * @returns {string}
   */
  getDescription() {
    return `Pattern detector: ${this.getId()}`;
  }

  /**
   * Ejecuta la detección sobre el systemMap.
   * @param {Object} systemMap - Mapa del sistema analizado
   * @returns {Promise<DetectionResult>}
   */
  async detect(systemMap) {
    throw new Error(`${this.constructor.name} must implement detect(systemMap)`);
  }

  /**
   * Calcula el score global de detección.
   * 100 = sin problemas, 0 = máximos problemas.
   * @param {Array} findings - Hallazgos encontrados
   * @returns {number} Score 0-100
   */
  calculateScore(findings = []) {
    if (findings.length === 0) return 100;

    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;

    const penalty = critical * 20 + high * 10 + medium * 5;
    return Math.max(0, 100 - penalty);
  }
}

export default PatternDetector;
