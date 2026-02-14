/**
 * @fileoverview Singleton Manager - Gestión del patrón singleton para LLMService
 * 
 * Responsabilidad Única (SRP): Gestionar la instancia única de LLMService.
 * 
 * @module llm-service/singleton
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:services:llm:singleton');

// ==========================================
// Singleton State
// ==========================================
let _instance = null;
let _instancePromise = null;

/**
 * Obtiene la instancia singleton del servicio
 * @param {Function} factory - Función factory para crear la instancia
 * @returns {Promise<Object>} Instancia del servicio
 */
export async function getSingletonInstance(factory) {
  if (_instance) {
    return _instance;
  }
  
  if (_instancePromise) {
    return _instancePromise;
  }
  
  _instancePromise = (async () => {
    const service = factory();
    await service.initialize();
    _instance = service;
    _instancePromise = null;
    return service;
  })();
  
  return _instancePromise;
}

/**
 * Resetea la instancia singleton (útil para tests)
 * @param {Function} disposeFn - Función opcional para liberar recursos
 */
export async function resetSingleton(disposeFn = null) {
  if (_instance && disposeFn) {
    try {
      await disposeFn(_instance);
    } catch (error) {
      logger.warn('Error disposing singleton instance:', error.message);
    }
  }
  _instance = null;
  _instancePromise = null;
}

/**
 * Verifica si existe una instancia
 * @returns {boolean} true si existe instancia
 */
export function hasInstance() {
  return _instance !== null;
}

/**
 * Obtiene la instancia actual sin crear una nueva
 * @returns {Object|null} Instancia actual o null
 */
export function getCurrentInstance() {
  return _instance;
}
