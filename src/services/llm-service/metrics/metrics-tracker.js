/**
 * @fileoverview Metrics Tracker - Métricas para LLMService
 * 
 * Responsabilidad Única (SRP): Trackear y gestionar métricas del servicio LLM.
 * 
 * @module llm-service/metrics
 */

/**
 * Gestiona métricas del servicio LLM
 */
export class MetricsTracker {
  constructor() {
    this.reset();
  }

  /**
   * Resetea todas las métricas
   */
  reset() {
    this.data = {
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
  }

  /**
   * Registra una nueva petición
   */
  recordRequest() {
    this.data.requestsTotal++;
  }

  /**
   * Registra una petición exitosa
   * @param {number} latencyMs - Latencia en milisegundos
   */
  recordSuccess(latencyMs) {
    this.data.requestsSuccessful++;
    this._updateLatency(latencyMs);
  }

  /**
   * Registra una petición fallida
   * @param {Error} error - Error ocurrido
   * @param {number} latencyMs - Latencia en milisegundos
   */
  recordFailure(error, latencyMs) {
    this.data.requestsFailed++;
    this.data.lastError = error;
    this.data.lastErrorTime = Date.now();
    this._updateLatency(latencyMs);
    
    // Track error type
    const errorType = error?.name || 'Unknown';
    const currentCount = this.data.errorsByType.get(errorType) || 0;
    this.data.errorsByType.set(errorType, currentCount + 1);
  }

  /**
   * Registra un cache hit
   */
  recordCacheHit() {
    this.data.requestsCached++;
  }

  /**
   * Actualiza métricas de latencia
   * @private
   */
  _updateLatency(latencyMs) {
    this.data.latencyMsTotal += latencyMs;
    this.data.latencyMsAvg = 
      this.data.requestsTotal > 0 
        ? this.data.latencyMsTotal / this.data.requestsTotal 
        : 0;
  }

  /**
   * Obtiene métricas actuales
   * @returns {Object} Métricas
   */
  getMetrics() {
    return {
      ...this.data,
      errorsByType: Object.fromEntries(this.data.errorsByType),
      successRate: this._calculateSuccessRate(),
      cacheHitRate: this._calculateCacheHitRate()
    };
  }

  /**
   * Calcula tasa de éxito
   * @private
   */
  _calculateSuccessRate() {
    if (this.data.requestsTotal === 0) {
      return 0;
    }
    return (this.data.requestsSuccessful / this.data.requestsTotal) * 100;
  }

  /**
   * Calcula tasa de cache hits
   * @private
   */
  _calculateCacheHitRate() {
    if (this.data.requestsTotal === 0) {
      return 0;
    }
    return (this.data.requestsCached / this.data.requestsTotal) * 100;
  }

  /**
   * Obtiene resumen de métricas
   * @returns {Object} Resumen
   */
  getSummary() {
    return {
      total: this.data.requestsTotal,
      successful: this.data.requestsSuccessful,
      failed: this.data.requestsFailed,
      cached: this.data.requestsCached,
      avgLatency: Math.round(this.data.latencyMsAvg),
      successRate: Math.round(this._calculateSuccessRate() * 100) / 100,
      cacheHitRate: Math.round(this._calculateCacheHitRate() * 100) / 100
    };
  }
}
