/**
 * Server Manager - Handles LLM server configuration, health checks and selection
 */
export class ServerManager {
  constructor(config) {
    this.config = config || {};
    this.performance = this.config.performance || {};

    this.servers = {
      gpu: {
        url: `http://127.0.0.1:${this.config.llm?.gpu?.port || 8000}`,
        available: false,
        activeRequests: 0,
        maxParallel: this.config.llm?.gpu?.parallel || 4
      },
      cpu: {
        url: `http://127.0.0.1:${this.config.llm?.cpu?.port || 8001}`,
        available: false,
        activeRequests: 0,
        maxParallel: this.config.llm?.cpu?.parallel || 4
      }
    };
  }

  /**
   * Check if servers are available
   * @returns {Promise<{gpu: boolean, cpu: boolean}>}
   */
  async healthCheck() {
    const results = { gpu: false, cpu: false };

    // Check GPU server
    try {
      const response = await fetch(`${this.servers.gpu.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      results.gpu = response.ok;
      this.servers.gpu.available = response.ok;
    } catch (error) {
      this.servers.gpu.available = false;
    }

    // Check CPU server if enabled
    if (this.performance.enableCPUFallback) {
      try {
        const response = await fetch(`${this.servers.cpu.url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        results.cpu = response.ok;
        this.servers.cpu.available = response.ok;
      } catch (error) {
        this.servers.cpu.available = false;
      }
    }

    return results;
  }

  /**
   * Select the best available server
   * @param {string} preferredMode - 'gpu' or 'cpu'
   * @returns {string|null} - 'gpu', 'cpu', or null if none available
   */
  selectServer(preferredMode = 'gpu') {
    // Prefer requested mode if available and has free slots
    if (
      this.servers[preferredMode]?.available &&
      this.servers[preferredMode].activeRequests < this.servers[preferredMode].maxParallel
    ) {
      return preferredMode;
    }

    // Fallback to other server if enabled
    const fallbackMode = preferredMode === 'gpu' ? 'cpu' : 'gpu';
    if (
      this.performance.enableCPUFallback &&
      this.servers[fallbackMode]?.available &&
      this.servers[fallbackMode].activeRequests < this.servers[fallbackMode].maxParallel
    ) {
      return fallbackMode;
    }

    return null;
  }

  /**
   * Increment active requests for a server
   * @param {string} server - 'gpu' or 'cpu'
   */
  acquireServer(server) {
    if (this.servers[server]) {
      this.servers[server].activeRequests++;
    }
  }

  /**
   * Decrement active requests for a server
   * @param {string} server - 'gpu' or 'cpu'
   */
  releaseServer(server) {
    if (this.servers[server]) {
      this.servers[server].activeRequests--;
    }
  }

  /**
   * Get server URL
   * @param {string} server - 'gpu' or 'cpu'
   * @returns {string} Server URL
   */
  getServerUrl(server) {
    return this.servers[server]?.url;
  }

  /**
   * Check if CPU fallback is enabled
   * @returns {boolean}
   */
  isCPUFallbackEnabled() {
    return !!this.performance.enableCPUFallback;
  }

  /**
   * Get max concurrent analyses
   * @returns {number}
   */
  getMaxConcurrent() {
    return this.performance.maxConcurrentAnalyses || 4;
  }
}
