/**
 * @fileoverview file-change.js
 * 
 * Modelo: Representa un cambio individual de archivo
 * 
 * @module batch-processor/models/file-change
 */

import { Priority, ChangeType, DEFAULT_CONFIG } from '../constants.js';

/**
 * Representa un cambio individual de archivo
 */
export class FileChange {
  /**
   * @param {string} filePath - Ruta del archivo
   * @param {string} changeType - Tipo de cambio ('created', 'modified', 'deleted')
   * @param {Object} options - Opciones adicionales
   */
  constructor(filePath, changeType, options = {}) {
    this.filePath = filePath;
    this.changeType = changeType;
    this.priority = options.priority ?? Priority.LOW;
    this.timestamp = options.timestamp ?? Date.now();
    this.metadata = options.metadata ?? {};
    this.dependencies = new Set();    // Archivos que este archivo importa
    this.dependents = new Set();      // Archivos que importan este archivo
    this.retryCount = 0;
    this.maxRetries = options.maxRetries ?? DEFAULT_CONFIG.maxRetries;
  }

  /**
   * Incrementa contador de reintentos
   * @returns {boolean} - true si aún puede reintentar
   */
  incrementRetry() {
    this.retryCount++;
    return this.canRetry();
  }

  /**
   * Verifica si debe reintentarse
   * @returns {boolean}
   */
  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  /**
   * Agrega una dependencia
   * @param {string} depPath - Ruta del archivo dependencia
   */
  addDependency(depPath) {
    this.dependencies.add(depPath);
  }

  /**
   * Agrega un dependiente
   * @param {string} dependentPath - Ruta del archivo dependiente
   */
  addDependent(dependentPath) {
    this.dependents.add(dependentPath);
  }

  /**
   * Convierte a objeto plano para serialización
   * @returns {Object}
   */
  toJSON() {
    return {
      filePath: this.filePath,
      changeType: this.changeType,
      priority: this.priority,
      timestamp: this.timestamp,
      metadata: this.metadata,
      dependencies: Array.from(this.dependencies),
      dependents: Array.from(this.dependents),
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }
}
