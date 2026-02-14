/**
 * @fileoverview llm-service.js
 * 
 * Servicio centralizado para comunicación con LLM (servidor GPU/CPU).
 * 
 * ARQUITECTURA:
 * - Singleton: Una única instancia compartida por toda la aplicación
 * - Circuit Breaker: Evita cascada de fallos cuando GPU muere
 * - Health Checking: Automático y centralizado
 * - Métricas: Latencia, errores, throughput
 * - Eventos: Notificaciones de estado disponible/no disponible
 * 
 * @module services/llm-service
 */

import { LLMClient } from '../ai/llm/client.js';
import { loadAIConfig } from '../ai/llm/load-config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:services:llm');

// ==========================================
// Circuit Breaker States
// ==========================================
const CB_STATE = {
  CLOSED: 'CLOSED',      // Normal operation
  OPEN: 'OPEN',          // Failing, rejecting requests
  HALF_OPEN: 'HALF_OPEN' // Testing if recovered
};

// ==========================================
// Singleton Instance
// ==========================================
let _instance = null;
let _instancePromise = null;

/**
 * Servicio centralizado para comunicación con LLM
 * 
 * Responsabilidades:
 * 1. Gestionar conexión única al servidor GPU
 * 2. Health checking automático
 * 3. Circuit breaker para resiliencia
 * 4. Métricas y logging centralizado
 * 5. Notificar cambios de estado
 */
export class LLMService {
  /**
   * Obtiene la instancia singleton del servicio
   * @returns {Promise<LLMService>}
   */
  static async getInstance() {
    if (_instance) {
      return _instance;
    }
    
    if (_instancePromise) {
      return _instancePromise;
    }
    
    _instancePromise = (async () => {
      const service = new LLMService();
      await service.initialize();
      _instance = service;
      _instancePromise = null;
      return service;
    })();
    
    return _instancePromise;
  }

  /**
   * Resetea la instancia singleton (útil para tests)
   */
  static resetInstance() {
    if (_instance) {
      _instance.dispose().catch(() => {});
    }
    _instance = null;
    _instancePromise = null;
  }

  constructor() {
    if (_instance) {
      throw new Error('LLMService is a singleton. Use LLMService.getInstance() instead.');
    }

    this.client = null;
    this.config = null;
    this.initialized = false;
    this.initializing = false;
    
    // Health checking
    this._healthCheckInterval = null;
    this._healthCheckIntervalMs = 5000; // 5 seconds
    this._lastHealthCheck = null;
    this._available = false;
    
    // Circuit breaker
    this._cbState = CB_STATE.CLOSED;
    this._cbFailureCount = 0;
    this._cbSuccessCount = 0;
    this._cbThreshold = 5;        // Failures before opening
    this._cbResetTimeoutMs = 30000; // 30 seconds before half-open
    this._cbLastFailureTime = null;
    
    // Metrics
    this._metrics = {
      requestsTotal: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      latencyMsTotal: 0,
      latencyMsAvg: 0,
      errorsByType: new Map(),
      lastError: null,
      lastErrorTime: null
    };
    
    // Event handlers
    this._eventHandlers = {
      available: [],
      unavailable: [],
      error: []
    };
  }

  // ==========================================
  // Initialization
  // ==========================================

  /**
   * Inicializa el servicio
   * @returns {Promise<boolean>} true si se inicializó correctamente
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.initialized;
    }
    
    this.initializing = true;
    
    try {
      logger.info('🔧 Initializing LLMService...');
      
      // Load configuration
      this.config = await loadAIConfig();
      
      // Create LLMClient
      this.client = new LLMClient(this.config);
      
      // Initial health check
      await this._performHealthCheck();
      
      // Start automatic health checking
      this._startHealthChecking();
      
      this.initialized = true;
      logger.info(`✅ LLMService initialized (available: ${this._available})`);
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize LLMService:', error.message);
      this._metrics.lastError = error;
      this._metrics.lastErrorTime = Date.now();
      return false;
    } finally {
      this.initializing = false;
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Verifica si el LLM está disponible
   * @returns {boolean}
   */
  isAvailable() {
    return this._available && this._cbState !== CB_STATE.OPEN;
  }

  /**
   * Espera a que el LLM esté disponible
   * @param {number} timeoutMs - Timeout en milisegundos
   * @returns {Promise<boolean>} true si está disponible, false si timeout
   */
  async waitForAvailable(timeoutMs = 60000) {
    if (this.isAvailable()) {
      return true;
    }
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Try to trigger health check
      await this._performHealthCheck();
      
      if (this.isAvailable()) {
        return true;
      }
      
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return false;
  }

  /**
   * Analiza código usando el LLM
   * @param {string} prompt - Prompt para el LLM
   * @param {Object} options - Opciones adicionales
   * @param {string} options.mode - 'gpu' o 'cpu'
   * @param {string} options.systemPrompt - System prompt personalizado
   * @returns {Promise<object>} - Respuesta del LLM
   * @throws {Error} Si el servicio no está disponible o circuit breaker abierto
   */
  async analyze(prompt, options = {}) {
    // Check circuit breaker
    if (this._cbState === CB_STATE.OPEN) {
      // Check if we should try half-open
      if (this._cbLastFailureTime && 
          Date.now() - this._cbLastFailureTime > this._cbResetTimeoutMs) {
        logger.info('🔧 Circuit breaker transitioning to HALF_OPEN');
        this._cbState = CB_STATE.HALF_OPEN;
        this._cbSuccessCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - LLM service temporarily unavailable');
      }
    }
    
    // Check availability
    if (!this.isAvailable()) {
      throw new Error('LLM service is not available');
    }
    
    // Update metrics
    this._metrics.requestsTotal++;
    const startTime = Date.now();
    
    try {
      // Perform analysis
      const result = await this.client.analyze(prompt, options);
      
      // Update success metrics
      const latency = Date.now() - startTime;
      this._metrics.requestsSuccessful++;
      this._updateLatencyMetrics(latency);
      
      // Update circuit breaker on success
      if (this._cbState === CB_STATE.HALF_OPEN) {
        this._cbSuccessCount++;
        if (this._cbSuccessCount >= 2) {
          logger.info('✅ Circuit breaker transitioning to CLOSED');
          this._cbState = CB_STATE.CLOSED;
          this._cbFailureCount = 0;
        }
      } else {
        this._cbFailureCount = 0;
      }
      
      return result;
      
    } catch (error) {
      // Update failure metrics
      const latency = Date.now() - startTime;
      this._metrics.requestsFailed++;
      this._metrics.lastError = error;
      this._metrics.lastErrorTime = Date.now();
      this._updateLatencyMetrics(latency);
      
      // Track error type
      const errorType = error.name || 'Unknown';
      const currentCount = this._metrics.errorsByType.get(errorType) || 0;
      this._metrics.errorsByType.set(errorType, currentCount + 1);
      
      // Update circuit breaker on failure
      this._cbFailureCount++;
      this._cbLastFailureTime = Date.now();
      
      if (this._cbFailureCount >= this._cbThreshold) {
        logger.warn(`⚠️ Circuit breaker transitioning to OPEN (failures: ${this._cbFailureCount})`);
        this._cbState = CB_STATE.OPEN;
        this._emit('error', { error, circuitBreakerOpen: true });
      }
      
      throw error;
    }
  }

  /**
   * Analiza múltiples prompts en batch
   * @param {Array<{prompt: string, options?: object}>} requests
   * @returns {Promise<Array<object>>}
   */
  async analyzeBatch(requests) {
    if (!this.isAvailable()) {
      throw new Error('LLM service is not available');
    }
    
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.analyze(request.prompt, request.options);
        results.push(result);
      } catch (error) {
        results.push({ error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Registra un handler para eventos
   * @param {'available'|'unavailable'|'error'} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._eventHandlers[event]) {
      throw new Error(`Unknown event: ${event}`);
    }
    this._eventHandlers[event].push(handler);
  }

  /**
   * Remueve un handler de eventos
   * @param {'available'|'unavailable'|'error'} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (!this._eventHandlers[event]) {
      return;
    }
    const idx = this._eventHandlers[event].indexOf(handler);
    if (idx !== -1) {
      this._eventHandlers[event].splice(idx, 1);
    }
  }

  /**
   * Obtiene métricas actuales
   * @returns {object}
   */
  getMetrics() {
    return {
      ...this._metrics,
      errorsByType: Object.fromEntries(this._metrics.errorsByType),
      availability: this._available,
      circuitBreakerState: this._cbState,
      circuitBreakerFailureCount: this._cbFailureCount
    };
  }

  /**
   * Obtiene estado del circuit breaker
   * @returns {object}
   */
  getCircuitBreakerState() {
    return {
      state: this._cbState,
      failureCount: this._cbFailureCount,
      successCount: this._cbSuccessCount,
      lastFailureTime: this._cbLastFailureTime,
      threshold: this._cbThreshold,
      resetTimeoutMs: this._cbResetTimeoutMs
    };
  }

  /**
   * Fuerza un health check inmediato
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    return this._performHealthCheck();
  }

  /**
   * Libera recursos
   */
  async dispose() {
    logger.info('🧹 Disposing LLMService...');
    
    this._stopHealthChecking();
    
    this.client = null;
    this.config = null;
    this.initialized = false;
    this._available = false;
    
    // Clear event handlers
    this._eventHandlers.available = [];
    this._eventHandlers.unavailable = [];
    this._eventHandlers.error = [];
    
    logger.info('✅ LLMService disposed');
  }

  // ==========================================
  // Private Methods
  // ==========================================

  /**
   * Realiza health check del servidor LLM
   * @private
   */
  async _performHealthCheck() {
    if (!this.client) {
      return false;
    }
    
    try {
      const health = await this.client.healthCheck();
      const wasAvailable = this._available;
      this._available = health.gpu || health.cpu;
      this._lastHealthCheck = Date.now();
      
      // Emit state change events
      if (!wasAvailable && this._available) {
        logger.info('✅ LLM is now available');
        this._emit('available', { health });
      } else if (wasAvailable && !this._available) {
        logger.warn('⚠️  LLM is no longer available');
        this._emit('unavailable', { health });
      }
      
      return this._available;
    } catch (error) {
      this._available = false;
      this._lastHealthCheck = Date.now();
      logger.debug('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Inicia health checking automático
   * @private
   */
  _startHealthChecking() {
    if (this._healthCheckInterval) {
      return;
    }
    
    logger.info(`🔍 Starting automatic health checks (every ${this._healthCheckIntervalMs}ms)`);
    
    this._healthCheckInterval = setInterval(async () => {
      await this._performHealthCheck();
    }, this._healthCheckIntervalMs);
  }

  /**
   * Detiene health checking automático
   * @private
   */
  _stopHealthChecking() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
      logger.info('🛑 Health checking stopped');
    }
  }

  /**
   * Emite un evento a los handlers registrados
   * @private
   */
  _emit(event, data) {
    if (!this._eventHandlers[event]) {
      return;
    }
    
    for (const handler of this._eventHandlers[event]) {
      try {
        handler(data);
      } catch (error) {
        logger.error(`Error in event handler for ${event}:`, error.message);
      }
    }
  }

  /**
   * Actualiza métricas de latencia
   * @private
   */
  _updateLatencyMetrics(latencyMs) {
    this._metrics.latencyMsTotal += latencyMs;
    this._metrics.latencyMsAvg = 
      this._metrics.latencyMsTotal / this._metrics.requestsTotal;
  }
}

// ==========================================
// Convenience Exports
// ==========================================

/**
 * Analiza código usando el LLM (convenience function)
 * @param {string} prompt - Prompt para el LLM
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<object>}
 */
export async function analyzeWithLLM(prompt, options = {}) {
  const service = await LLMService.getInstance();
  return service.analyze(prompt, options);
}

/**
 * Verifica si el LLM está disponible (convenience function)
 * @returns {Promise<boolean>}
 */
export async function isLLMAvailable() {
  const service = await LLMService.getInstance();
  return service.isAvailable();
}

/**
 * Espera a que el LLM esté disponible (convenience function)
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export async function waitForLLM(timeoutMs = 60000) {
  const service = await LLMService.getInstance();
  return service.waitForAvailable(timeoutMs);
}

// Default export
export default LLMService;
