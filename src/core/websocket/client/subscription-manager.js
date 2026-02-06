/**
 * @fileoverview subscription-manager.js
 * 
 * Gestión de suscripciones de cliente
 * 
 * @module websocket/client/subscription-manager
 */

/**
 * Manager de suscripciones para un cliente
 */
export class SubscriptionManager {
  constructor() {
    this.subscriptions = new Set();
    this.projectPath = null;
  }

  /**
   * Suscribe a un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - true si es nueva suscripción
   */
  subscribe(filePath) {
    if (this.subscriptions.has(filePath)) {
      return false;
    }
    this.subscriptions.add(filePath);
    return true;
  }

  /**
   * Desuscribe de un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - true si existía la suscripción
   */
  unsubscribe(filePath) {
    return this.subscriptions.delete(filePath);
  }

  /**
   * Verifica si está suscrito a un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  isSubscribedTo(filePath) {
    // Si no tiene suscripciones específicas, recibe todo
    if (this.subscriptions.size === 0) {
      return true;
    }
    return this.subscriptions.has(filePath);
  }

  /**
   * Establece el proyecto asociado
   * @param {string} projectPath - Ruta del proyecto
   */
  setProject(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Obtiene el proyecto asociado
   * @returns {string|null}
   */
  getProject() {
    return this.projectPath;
  }

  /**
   * Limpia todas las suscripciones
   * @returns {number} - Cantidad de suscripciones eliminadas
   */
  clear() {
    const count = this.subscriptions.size;
    this.subscriptions.clear();
    return count;
  }

  /**
   * Obtiene todas las suscripciones
   * @returns {string[]}
   */
  getAll() {
    return Array.from(this.subscriptions);
  }

  /**
   * Obtiene cantidad de suscripciones
   * @returns {number}
   */
  get count() {
    return this.subscriptions.size;
  }
}
