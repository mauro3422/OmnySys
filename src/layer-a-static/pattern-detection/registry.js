/**
 * @fileoverview Pattern Detector Registry
 * 
 * Gestiona el registro de detectores disponibles.
 * Permite añadir/quitar detectores dinámicamente.
 * 
 * @module pattern-detection/registry
 */

export class PatternDetectorRegistry {
  constructor() {
    this.detectors = new Map();
  }
  
  /**
   * Registra un nuevo detector
   * 
   * @param {object} config - Configuración del detector
   * @param {string} config.id - Identificador único
   * @param {function} config.loader - Función que carga el detector (async)
   * @param {number} config.priority - Prioridad de ejecución (mayor = primero)
   * @param {Array<string>} config.dependencies - IDs de detectores que deben ejecutarse antes
   */
  register(config) {
    if (this.detectors.has(config.id)) {
      throw new Error(`Detector ${config.id} already registered`);
    }
    
    this.detectors.set(config.id, {
      ...config,
      registeredAt: new Date().toISOString()
    });
  }
  
  /**
   * Remueve un detector
   */
  unregister(id) {
    return this.detectors.delete(id);
  }
  
  /**
   * Obtiene un detector por ID
   */
  get(id) {
    return this.detectors.get(id);
  }
  
  /**
   * Obtiene todos los detectores ordenados por prioridad
   */
  getAll() {
    return Array.from(this.detectors.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Verifica si existe un detector
   */
  has(id) {
    return this.detectors.has(id);
  }
  
  /**
   * Limpia todos los detectores
   */
  clear() {
    this.detectors.clear();
  }
  
  /**
   * Obtiene cantidad de detectores registrados
   */
  size() {
    return this.detectors.size;
  }
}

export default PatternDetectorRegistry;
