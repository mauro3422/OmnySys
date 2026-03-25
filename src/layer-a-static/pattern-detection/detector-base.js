/**
 * @fileoverview Detector Base Class
 * 
 * Clase base para todos los detectores de patrones.
 * Separada del engine para evitar dependencias circulares.
 * 
 * @module pattern-detection/detector-base
 */

/**
 * Interfaz base para todos los detectores
 * Cada detector debe implementar esta interfaz
 */
export class PatternDetector {
  constructor(options = {}, globalConfig = {}) {
    this.config = options.config !== undefined ? options.config : options;
    this.globalConfig = options.globalConfig !== undefined ? options.globalConfig : globalConfig;
    this._id = options.id ?? this.config?.id ?? null;
    this._name = options.name ?? this.config?.name ?? null;
    this._description = options.description ?? this.config?.description ?? '';
    const loggerId = this._id || 'PatternDetector';
    this._logger = {
      info: (msg, ...args) => console.log(`[${loggerId}] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[${loggerId}] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[${loggerId}] ${msg}`, ...args),
      debug: (msg, ...args) => process.env.DEBUG && console.log(`[${loggerId}] ${msg}`, ...args)
    };
  }
  
  /**
   * Identificador único del detector
   */
  getId() {
    if (this._id) return this._id;
    throw new Error('Detector must implement getId()');
  }

  /**
   * Nombre legible del detector
   */
  getName() {
    return this._name || this._id || 'Unknown Detector';
  }

  /**
   * Descripción del detector
   */
  getDescription() {
    return this._description || 'No description available';
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
  scoreFindings(findings) {
    if (!findings || findings.length === 0) return 100;
    
    // Implementación base: cada finding reduce el score
    // Los detectores pueden sobrescribir esto
    const totalPenalty = findings.reduce((sum, f) => {
      const severity = f.severity || 'low';
      return sum + (severity === 'critical' ? 20 :
                    severity === 'high' ? 10 :
                    severity === 'medium' ? 5 : 2);
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
