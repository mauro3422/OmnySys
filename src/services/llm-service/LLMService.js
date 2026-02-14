/**
 * @fileoverview LLMService.js
 * 
 * Main LLM Service class with provider pattern, caching, and health checking.
 * Refactored from the original monolithic llm-service.js
 * 
 * @module llm-service/LLMService
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { createLogger } from '../../utils/logger.js';
import { LocalProvider } from './providers/local-provider.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { RequestHandler } from './handlers/request-handler.js';
import { ResponseHandler } from './handlers/response-handler.js';
import { ResponseCache } from './cache/response-cache.js';
import { HealthChecker } from './health/health-checker.js';
import { MetricsTracker } from './metrics/metrics-tracker.js';
import { processBatch, chunkArray } from './batch/batch-processor.js';
import { getSingletonInstance, resetSingleton } from './singleton/singleton-manager.js';

const logger = createLogger('OmnySys:services:llm');

// ==========================================
// Circuit Breaker States
// ==========================================
export const CB_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

/**
 * Servicio centralizado para comunicación con LLM
 */
export class LLMService {
  /**
   * Obtiene la instancia singleton del servicio
   * @returns {Promise<LLMService>}
   */
  static async getInstance() {
    return getSingletonInstance(() => new LLMService());
  }

  /**
   * Resetea la instancia singleton (útil para tests)
   */
  static async resetInstance() {
    await resetSingleton((instance) => instance.dispose());
  }

  constructor() {
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
    
    // Components
    this.healthChecker = new HealthChecker({ intervalMs: 5000 });
    this.metrics = new MetricsTracker();
    
    // Event handlers
    this._errorHandlers = [];

    // Register default providers
    this._registerDefaultProviders();
  }

  /**
   * Inicializa el servicio
   * @returns {Promise<boolean>} true si se inicializó correctamente
   */
  async initialize() {
    if (this.initialized) return true;
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
      if (provider?.initialize) {
        await provider.initialize();
      }
      
      // Initial health check
      await this.healthChecker.check(provider);
      
      // Start automatic health checking
      this.healthChecker.start(() => this._performHealthCheck());
      
      this.initialized = true;
      logger.info(`✅ LLMService initialized (available: ${this.healthChecker.available})`);
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize LLMService:', error.message);
      this.metrics.recordFailure(error, 0);
      return false;
    } finally {
      this.initializing = false;
    }
  }

  // ==========================================
  // Provider Management
  // ==========================================

  registerProvider(name, provider) {
    this.providers.set(name, provider);
    logger.debug(`Provider registered: ${name}`);
  }

  getProvider(name = null) {
    return this.providers.get(name || this.defaultProvider) || null;
  }

  setDefaultProvider(name) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider not found: ${name}`);
    }
    this.defaultProvider = name;
    logger.debug(`Default provider set to: ${name}`);
  }

  getProviderNames() {
    return Array.from(this.providers.keys());
  }

  // ==========================================
  // Public API
  // ==========================================

  isAvailable() {
    const provider = this.getProvider();
    if (!provider) return false;
    
    const cbState = provider.getCircuitBreakerState();
    return this.healthChecker.available && cbState.state !== CB_STATE.OPEN;
  }

  async waitForAvailable(timeoutMs = 60000) {
    if (this.isAvailable()) return true;
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await this._performHealthCheck();
      if (this.isAvailable()) return true;
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  async analyze(prompt, options = {}) {
    const startTime = Date.now();
    this.metrics.recordRequest();

    const providerName = options.provider || this.defaultProvider;
    const provider = this.getProvider(providerName);
    
    if (!provider) {
      this.metrics.recordFailure(new Error(`Provider not found: ${providerName}`), 0);
      throw new Error(`Provider not found: ${providerName}`);
    }

    if (!provider.isCircuitBreakerClosed()) {
      this.metrics.recordFailure(new Error(`Circuit breaker is OPEN`), 0);
      throw new Error(`Circuit breaker is OPEN - ${providerName} service temporarily unavailable`);
    }

    if (!this.healthChecker.available) {
      this.metrics.recordFailure(new Error('LLM service is not available'), 0);
      throw new Error('LLM service is not available');
    }

    // Prepare request
    let preparedRequest;
    try {
      preparedRequest = this.requestHandler.prepare(prompt, options);
    } catch (error) {
      this.metrics.recordFailure(error, Date.now() - startTime);
      throw error;
    }

    // Check cache
    const useCache = options.useCache !== false;
    if (useCache) {
      const cacheKey = this.cache.generateKey(preparedRequest.prompt, preparedRequest.options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.metrics.recordCacheHit();
        logger.debug('Cache hit, returning cached response');
        return cached;
      }
    }

    try {
      const rawResult = await provider.analyze(preparedRequest.prompt, preparedRequest.options);
      const processedResponse = this.responseHandler.process(rawResult, {
        requestId: preparedRequest.requestId
      });

      if (!processedResponse.success) {
        throw processedResponse.error;
      }

      const latency = Date.now() - startTime;
      this.metrics.recordSuccess(latency);

      if (useCache) {
        const cacheKey = this.cache.generateKey(preparedRequest.prompt, preparedRequest.options);
        this.cache.set(cacheKey, processedResponse.data);
      }

      return processedResponse.data;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordFailure(error, latency);
      
      const cbState = provider.getCircuitBreakerState();
      if (cbState.state === CB_STATE.OPEN) {
        this._emitError({ error, circuitBreakerOpen: true, provider: providerName });
      }

      throw error;
    }
  }

  async analyzeBatch(requests, batchOptions = {}) {
    if (!this.isAvailable()) {
      throw new Error('LLM service is not available');
    }

    return processBatch(
      requests, 
      (prompt, options) => this.analyze(prompt, options), 
      batchOptions
    );
  }

  // ==========================================
  // Event Handling
  // ==========================================

  on(event, handler) {
    if (event === 'error') {
      this._errorHandlers.push(handler);
    } else {
      this.healthChecker.on(event, handler);
    }
  }

  off(event, handler) {
    if (event === 'error') {
      const idx = this._errorHandlers.indexOf(handler);
      if (idx !== -1) this._errorHandlers.splice(idx, 1);
    } else {
      this.healthChecker.off(event, handler);
    }
  }

  _emitError(data) {
    for (const handler of this._errorHandlers) {
      try {
        handler(data);
      } catch (error) {
        logger.error('Error in error handler:', error.message);
      }
    }
  }

  // ==========================================
  // Metrics & Status
  // ==========================================

  getMetrics() {
    const provider = this.getProvider();
    return {
      ...this.metrics.getMetrics(),
      availability: this.healthChecker.available,
      circuitBreaker: provider ? provider.getCircuitBreakerState() : null,
      cache: this.cache.getStats(),
      providers: this.getProviderNames()
    };
  }

  getCircuitBreakerState(providerName = null) {
    const provider = this.getProvider(providerName);
    return provider ? provider.getCircuitBreakerState() : null;
  }

  async checkHealth() {
    return this._performHealthCheck();
  }

  // ==========================================
  // Lifecycle
  // ==========================================

  async dispose() {
    logger.info('🧹 Disposing LLMService...');
    
    this.healthChecker.dispose();
    
    for (const [name, provider] of this.providers) {
      try {
        await provider.dispose();
        logger.debug(`Provider disposed: ${name}`);
      } catch (error) {
        logger.warn(`Error disposing provider ${name}:`, error.message);
      }
    }
    this.providers.clear();
    
    this.cache.dispose();
    
    this.initialized = false;
    this._errorHandlers = [];
    
    logger.info('✅ LLMService disposed');
  }

  // ==========================================
  // Private Methods
  // ==========================================

  _registerDefaultProviders() {
    this.registerProvider('local', new LocalProvider());
    
    if (process.env.OPENAI_API_KEY) {
      this.registerProvider('openai', new OpenAIProvider());
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.registerProvider('anthropic', new AnthropicProvider());
    }
  }

  async _performHealthCheck() {
    const provider = this.getProvider();
    return this.healthChecker.check(provider);
  }
}

export default LLMService;
