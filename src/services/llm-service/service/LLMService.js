/**
 * @fileoverview LLMService.js - Main LLM Service class
 * @module llm-service/service/LLMService
 * @version 0.9.4
 */

import { createLogger } from '../../../utils/logger.js';
import { LocalProvider } from '../providers/local-provider.js';
import { OpenAIProvider } from '../providers/openai-provider.js';
import { AnthropicProvider } from '../providers/anthropic-provider.js';
import { RequestHandler } from '../handlers/request-handler.js';
import { ResponseHandler } from '../handlers/response-handler.js';
import { ResponseCache } from '../cache/response-cache/index.js';
import { HealthChecker } from '../health/health-checker.js';
import { MetricsTracker } from '../metrics/metrics-tracker.js';
import { processBatch } from '../batch/batch-processor.js';
import { getSingletonInstance, resetSingleton } from '../singleton/singleton-manager.js';
import { CB_STATE } from '../constants.js';

const logger = createLogger('OmnySys:services:llm');

export class LLMService {
  static async getInstance() {
    return getSingletonInstance(() => new LLMService());
  }

  static async resetInstance() {
    await resetSingleton((instance) => instance.dispose());
  }

  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'local';
    this.requestHandler = new RequestHandler();
    this.responseHandler = new ResponseHandler();
    this.cache = new ResponseCache();
    this.initialized = false;
    this.initializing = false;
    this.healthChecker = new HealthChecker({ intervalMs: 5000 });
    this.metrics = new MetricsTracker();
    this._errorHandlers = [];
    this._registerDefaultProviders();
  }

  async initialize() {
    if (this.initialized) return true;
    if (this.initializing) {
      while (this.initializing) await new Promise(r => setTimeout(r, 100));
      return this.initialized;
    }
    this.initializing = true;
    try {
      logger.info('🔧 Initializing LLMService...');
      const provider = this.providers.get(this.defaultProvider);
      if (provider?.initialize) await provider.initialize();
      await this.healthChecker.check(provider);
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

  registerProvider(name, provider) {
    this.providers.set(name, provider);
    logger.debug(`Provider registered: ${name}`);
  }

  getProvider(name = null) {
    return this.providers.get(name || this.defaultProvider) || null;
  }

  setDefaultProvider(name) {
    if (!this.providers.has(name)) throw new Error(`Provider not found: ${name}`);
    this.defaultProvider = name;
    logger.debug(`Default provider set to: ${name}`);
  }

  getProviderNames() {
    return Array.from(this.providers.keys());
  }

  isAvailable() {
    const provider = this.getProvider();
    if (!provider) return false;
    return this.healthChecker.available && provider.getCircuitBreakerState().state !== CB_STATE.OPEN;
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
    let preparedRequest;
    try { preparedRequest = this.requestHandler.prepare(prompt, options); }
    catch (error) { this.metrics.recordFailure(error, Date.now() - startTime); throw error; }
    const useCache = options.useCache !== false;
    if (useCache) {
      const cacheKey = this.cache.generateKey(preparedRequest.prompt, preparedRequest.options);
      const cached = this.cache.get(cacheKey);
      if (cached) { this.metrics.recordCacheHit(); logger.debug('Cache hit'); return cached; }
    }
    try {
      const rawResult = await provider.analyze(preparedRequest.prompt, preparedRequest.options);
      const processed = this.responseHandler.process(rawResult, { requestId: preparedRequest.requestId });
      if (!processed.success) throw processed.error;
      const latency = Date.now() - startTime;
      this.metrics.recordSuccess(latency);
      if (useCache) this.cache.set(this.cache.generateKey(preparedRequest.prompt, preparedRequest.options), processed.data);
      return processed.data;
    } catch (error) {
      this.metrics.recordFailure(error, Date.now() - startTime);
      if (provider.getCircuitBreakerState().state === CB_STATE.OPEN) {
        this._emitError({ error, circuitBreakerOpen: true, provider: providerName });
      }
      throw error;
    }
  }

  async analyzeBatch(requests, batchOptions = {}) {
    if (!this.isAvailable()) throw new Error('LLM service is not available');
    return processBatch(requests, (p, o) => this.analyze(p, o), batchOptions);
  }

  on(event, handler) {
    if (event === 'error') this._errorHandlers.push(handler);
    else this.healthChecker.on(event, handler);
  }

  off(event, handler) {
    if (event === 'error') {
      const idx = this._errorHandlers.indexOf(handler);
      if (idx !== -1) this._errorHandlers.splice(idx, 1);
    } else this.healthChecker.off(event, handler);
  }

  _emitError(data) {
    for (const handler of this._errorHandlers) {
      try { handler(data); } catch (e) { logger.error('Error in error handler:', e.message); }
    }
  }

  getMetrics() {
    const provider = this.getProvider();
    return { ...this.metrics.getMetrics(), availability: this.healthChecker.available,
      circuitBreaker: provider ? provider.getCircuitBreakerState() : null,
      cache: this.cache.getStats(), providers: this.getProviderNames() };
  }

  getCircuitBreakerState(providerName = null) {
    const provider = this.getProvider(providerName);
    return provider ? provider.getCircuitBreakerState() : null;
  }

  async checkHealth() { return this._performHealthCheck(); }

  async dispose() {
    logger.info('🧹 Disposing LLMService...');
    this.healthChecker.dispose();
    for (const [name, provider] of this.providers) {
      try { await provider.dispose(); logger.debug(`Provider disposed: ${name}`); }
      catch (error) { logger.warn(`Error disposing provider ${name}:`, error.message); }
    }
    this.providers.clear();
    this.cache.dispose();
    this.initialized = false;
    this._errorHandlers = [];
    logger.info('✅ LLMService disposed');
  }

  _registerDefaultProviders() {
    this.registerProvider('local', new LocalProvider());
    if (process.env.OPENAI_API_KEY) this.registerProvider('openai', new OpenAIProvider());
    if (process.env.ANTHROPIC_API_KEY) this.registerProvider('anthropic', new AnthropicProvider());
  }

  async _performHealthCheck() { return this.healthChecker.check(this.getProvider()); }
}

export default LLMService;
