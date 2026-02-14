/**
 * @fileoverview Health Checker - Health checking para LLMService
 * 
 * Responsabilidad Única (SRP): Gestionar health checks del servicio LLM.
 * 
 * @module llm-service/health
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:services:llm:health');

/**
 * Gestiona health checking para LLMService
 */
export class HealthChecker {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 5000;
    this.intervalId = null;
    this.lastCheck = null;
    this.available = false;
    this.eventHandlers = {
      available: [],
      unavailable: []
    };
  }

  /**
   * Realiza health check del provider
   * @param {Object} provider - Provider LLM
   * @returns {Promise<boolean>} true si está disponible
   */
  async check(provider) {
    if (!provider) {
      this.available = false;
      return false;
    }
    
    try {
      const health = await provider.healthCheck();
      const wasAvailable = this.available;
      this.available = health.available || false;
      this.lastCheck = Date.now();
      
      // Emit state change events
      if (!wasAvailable && this.available) {
        logger.info('✅ LLM is now available');
        this._emit('available', { health });
      } else if (wasAvailable && !this.available) {
        logger.warn('⚠️  LLM is no longer available');
        this._emit('unavailable', { health });
      }
      
      return this.available;
    } catch (error) {
      this.available = false;
      this.lastCheck = Date.now();
      logger.debug('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Inicia health checking automático
   * @param {Function} checkFn - Función de health check
   */
  start(checkFn) {
    if (this.intervalId) {
      return;
    }
    
    logger.info(`🔍 Starting automatic health checks (every ${this.intervalMs}ms)`);
    
    this.intervalId = setInterval(async () => {
      await checkFn();
    }, this.intervalMs);
  }

  /**
   * Detiene health checking automático
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🛑 Health checking stopped');
    }
  }

  /**
   * Registra un handler para eventos de disponibilidad
   * @param {'available'|'unavailable'} event - Tipo de evento
   * @param {Function} handler - Handler a registrar
   */
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Remueve un handler de eventos
   * @param {'available'|'unavailable'} event - Tipo de evento
   * @param {Function} handler - Handler a remover
   */
  off(event, handler) {
    if (!this.eventHandlers[event]) {
      return;
    }
    const idx = this.eventHandlers[event].indexOf(handler);
    if (idx !== -1) {
      this.eventHandlers[event].splice(idx, 1);
    }
  }

  /**
   * Emite un evento
   * @private
   */
  _emit(event, data) {
    if (!this.eventHandlers[event]) {
      return;
    }
    
    for (const handler of this.eventHandlers[event]) {
      try {
        handler(data);
      } catch (error) {
        logger.error(`Error in health event handler for ${event}:`, error.message);
      }
    }
  }

  /**
   * Libera recursos
   */
  dispose() {
    this.stop();
    this.eventHandlers.available = [];
    this.eventHandlers.unavailable = [];
  }

  /**
   * Obtiene estado actual
   * @returns {Object} Estado del health checker
   */
  getState() {
    return {
      available: this.available,
      lastCheck: this.lastCheck,
      checking: this.intervalId !== null
    };
  }
}
