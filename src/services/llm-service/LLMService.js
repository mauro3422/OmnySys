/**
 * @fileoverview LLMService.js
 * 
 * Main LLM Service class with provider pattern, caching, and health checking.
 * Refactored from the original monolithic llm-service.js
 * 
 * @module llm-service/LLMService
 */

import { createLogger } from '../../utils/logger.js';
import { LocalProvider } from './providers/local-provider.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { RequestHandler } from './handlers/request-handler.js';
import { ResponseHandler } from './handlers/response-handler.js';
import { ResponseCache } from './cache/response-cache.js';

const logger = createLogger('OmnySys:services:llm');

// ==========================================
// Circuit Breaker States (re-exported for compatibility)
// ==========================================
export const CB_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
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
 * 1. Gestionar múltiples providers (local, OpenAI, Anthropic)
 * 2. Health checking automático
 * 3. Circuit breaker para resiliencia
 * 4. Caching de respuestas
 * 5. Métricas y logging centralizado
 * 6. Notificar cambios de estado
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

    // Providers
    this.providers = new Map();
    this.defaultProvider = 'local';
    
    // Handlers
    this.requestHandler = new RequestHandler();
    this.responseHandler = new ResponseHandler();
    
    // Cache
    this.cache = new ResponseCache();
    
    // State
    this.initialized = false;
    this.initializing = false;
    
    // Health checking
    this._healthCheckInterval = null;
    this._healthCheckIntervalMs = 5000;
    this._lastHealthCheck = null;
    this._available = false;
    
    // Metrics
    this._metrics = {
      requestsTotal: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      requestsCached: 0,
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

    // Register default providers
    this._registerDefaultProviders();
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
      while (this.initializing) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.initialized;
    }
    
    this.initializing = true;
    
    try {
      logger.info('🔧 Initializing LLMService...');
      
      // Initialize default provider
      const provider = this.providers.get(this.defaultProvider);
      if (provider && provider.initialize) {
        await provider.initialize();
      }
      
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
  // Provider Management
  // ==========================================

  /**
   * Register a provider
   * @param {string} name - Provider name
   * @param {BaseProvider} provider - Provider instance
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    logger.debug(`Provider registered: ${name}`);
  }

  /**
   * Get a provider by name
   * @param {string} name - Provider name
   * @returns {BaseProvider|null}
   */
  getProvider(name = null) {
    return this.providers.get(name || this.defaultProvider) || null;
  }

  /**
   * Set the default provider
   * @param {string} name - Provider name
   */
  setDefaultProvider(name) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider not found: ${name}`);
    }
    this.defaultProvider = name;
    logger.debug(`Default provider set to: ${name}`);
  }

  /**
   * Get list of registered providers
   * @returns {string[]}
   */
  getProviderNames() {
    return Array.from(this.providers.keys());
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Verifica si el LLM está disponible
   * @returns {boolean}
   */
  isAvailable() {
    const provider = this.getProvider();
    if (!provider) return false;
    
    const cbState = provider.getCircuitBreakerState();
    return this._available && cbState.state !== CB_STATE.OPEN;
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
      await this._performHealthCheck();
      
      if (this.isAvailable()) {
        return true;
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return false;
  }

  /**
   * Analiza código usando el LLM
   * @param {string} prompt - Prompt para el LLM
   * @param {Object} options - Opciones adicionales
   * @param {string} options.provider - Provider to use
   * @param {string} options.mode - 'gpu' o 'cpu'
   * @param {string} options.systemPrompt - System prompt personalizado
   * @param {boolean} options.useCache - Whether to use cache
   * @returns {Promise<object>} - Respuesta del LLM
   * @throws {Error} Si el servicio no está disponible o circuit breaker abierto
   */
  async analyze(prompt, options = {}) {
    const startTime = Date.now();
    this._metrics.requestsTotal++;

    const providerName = options.provider || this.defaultProvider;
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      this._metrics.requestsFailed++;
      throw new Error(`Provider not found: ${providerName}`);
    }

    // Check circuit breaker
    if (!provider.isCircuitBreakerClosed()) {
      this._metrics.requestsFailed++;
      throw new Error(`Circuit breaker is OPEN - ${providerName} service temporarily unavailable`);
    }

    // Check availability
    if (!this._available) {
      this._metrics.requestsFailed++;
      throw new Error('LLM service is not available');
    }

    // Prepare request
    let preparedRequest;
    try {
      preparedRequest = this.requestHandler.prepare(prompt, options);
    } catch (error) {
      this._metrics.requestsFailed++;
      throw error;
    }

    // Check cache
    const useCache = options.useCache !== false;
    if (useCache) {
      const cacheKey = this.cache.generateKey(preparedRequest.prompt, preparedRequest.options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this._metrics.requestsCached++;
        logger.debug('Cache hit, returning cached response');
        return cached;
      }
    }

    try {
      // Perform analysis
      const rawResult = await provider.analyze(preparedRequest.prompt, preparedRequest.options);
      
      // Process response
      const processedResponse = this.responseHandler.process(rawResult, {
        requestId: preparedRequest.requestId
      });

      if (!processedResponse.success) {
        throw processedResponse.error;
      }

      // Update metrics
      const latency = Date.now() - startTime;
      this._metrics.requestsSuccessful++;
      this._updateLatencyMetrics(latency);

      // Cache successful response
      if (useCache) {
        const cacheKey = this.cache.generateKey(preparedRequest.prompt, preparedRequest.options);
        this.cache.set(cacheKey, processedResponse.data);
      }

      return processedResponse.data;

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

      // Emit error event if circuit breaker opened
      const cbState = provider.getCircuitBreakerState();
      if (cbState.state === CB_STATE.OPEN) {
        this._emit('error', { error, circuitBreakerOpen: true, provider: providerName });
      }

      throw error;
    }
  }

  /**
   * Analiza múltiples prompts en batch
   * @param {Array<{prompt: string, options?: object}>} requests
   * @param {Object} batchOptions - Options for batch processing
   * @returns {Promise<Array<object>>}
   */
  async analyzeBatch(requests, batchOptions = {}) {
    if (!this.isAvailable()) {
      throw new Error('LLM service is not available');
    }

    const results = [];
    const concurrency = batchOptions.concurrency || 1;
    
    if (concurrency === 1) {
      // Sequential processing
      for (const request of requests) {
        try {
          const result = await this.analyze(request.prompt, request.options);
          results.push(result);
        } catch (error) {
          results.push({ error: error.message });
        }
      }
    } else {
      // Concurrent processing
      const chunks = this._chunkArray(requests, concurrency);
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(req => 
            this.analyze(req.prompt, req.options).catch(err => ({ error: err.message }))
          )
        );
        results.push(...chunkResults);
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
    const provider = this.getProvider();
    return {
      ...this._metrics,
      errorsByType: Object.fromEntries(this._metrics.errorsByType),
      availability: this._available,
      circuitBreaker: provider ? provider.getCircuitBreakerState() : null,
      cache: this.cache.getStats(),
      providers: this.getProviderNames()
    };
  }

  /**
   * Obtiene estado del circuit breaker
   * @param {string} providerName
   * @returns {object}
   */
  getCircuitBreakerState(providerName = null) {
    const provider = this.getProvider(providerName);
    return provider ? provider.getCircuitBreakerState() : null;
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
    
    // Dispose all providers
    for (const [name, provider] of this.providers) {
      try {
        await provider.dispose();
        logger.debug(`Provider disposed: ${name}`);
      } catch (error) {
        logger.warn(`Error disposing provider ${name}:`, error.message);
      }
    }
    this.providers.clear();
    
    // Dispose cache
    this.cache.dispose();
    
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
   * Register default providers
   * @private
   */
  _registerDefaultProviders() {
    // Local provider (default, uses LLMClient)
    this.registerProvider('local', new LocalProvider());
    
    // External providers (only if configured)
    if (process.env.OPENAI_API_KEY) {
      this.registerProvider('openai', new OpenAIProvider());
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.registerProvider('anthropic', new AnthropicProvider());
    }
  }

  /**
   * Realiza health check del servidor LLM
   * @private
   */
  async _performHealthCheck() {
    const provider = this.getProvider();
    if (!provider) {
      this._available = false;
      return false;
    }
    
    try {
      const health = await provider.healthCheck();
      const wasAvailable = this._available;
      this._available = health.available || false;
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
      this._metrics.requestsTotal > 0 
        ? this._metrics.latencyMsTotal / this._metrics.requestsTotal 
        : 0;
  }

  /**
   * Split array into chunks
   * @private
   */
  _chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export default LLMService;
