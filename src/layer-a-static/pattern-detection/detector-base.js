/**
 * @fileoverview Detector Base Class
 * 
 * Clase base para todos los detectores de patrones.
 * Separada del engine para evitar dependencias circulares.
 * 
 * @module pattern-detection/detector-base
 */

// Simple logger para evitar dependencias circulares
const createDetectorLogger = (id) => ({
  info: (msg, ...args) => console.log(`[${id}] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[${id}] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[${id}] ${msg}`, ...args),
  debug: (msg, ...args) => process.env.DEBUG && console.log(`[${id}] ${msg}`, ...args)
});

/**
 * Interfaz base para todos los detectores
 * Cada detector debe implementar esta interfaz
 */
export class PatternDetector {
  constructor(options = {}) {
    this.config = options.config || {};
    this.globalConfig = options.globalConfig || {};
    this.logger = createDetectorLogger(this.getId());
  }
  
  /**
   * Identificador único del detector
   */
  getId() {
    throw new Error('Detector must implement getId()');
  }
  
  /**
   * Nombre descriptivo
   */
  getName() {
    return this.getId();
  }
  
  /**
   * Descripción de qué detecta
   */
  getDescription() {
    return '';
  }
  
  /**
   * Método principal de detección
   * 
   * @param {object} systemMap - SystemMap completo
   * @returns {Promise<DetectionResult>}
   */
  async detect(systemMap) {
    throw new Error('Detector must implement detect()');
  }
  
  /**
   * Calcula score de 0-100 basado en findings
   * 100 = perfecto, 0 = terrible
   */
  calculateScore(findings) {
    if (!findings || findings.length === 0) return 100;
    
    // Implementación base: cada finding reduce el score
    // Los detectores pueden sobrescribir esto
    const totalPenalty = findings.reduce((sum, f) => {
      return sum + (f.severity === 'critical' ? 20 :
                    f.severity === 'high' ? 10 :
                    f.severity === 'medium' ? 5 : 2);
    }, 0);
    
    return Math.max(0, 100 - totalPenalty);
  }
}

/**
 * Result type para detección
 * @typedef {Object} DetectionResult
 * @property {string} detector - ID del detector
 * @property {string} name - Nombre legible
 * @property {string} description - Descripción
 * @property {Array<PatternFinding>} findings - Hallazgos encontrados
 * @property {number} score - Score 0-100
 * @property {number} weight - Peso en el score global
 * @property {string} recommendation - Recomendación general
 */

/**
 * Finding type para patrones individuales
 * @typedef {Object} PatternFinding
 * @property {string} id - Identificador único
 * @property {string} type - Tipo de patrón
 * @property {string} severity - 'critical' | 'high' | 'medium' | 'low'
 * @property {string} file - Archivo afectado
 * @property {number} line - Línea (opcional)
 * @property {string} message - Descripción del problema
 * @property {string} recommendation - Cómo solucionarlo
 * @property {object} metadata - Datos adicionales
 */

export default PatternDetector;
