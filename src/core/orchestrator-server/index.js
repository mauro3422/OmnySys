/**
 * @fileoverview Orchestrator Server - Main Entry Point
 * 
 * HTTP API server for managing analysis queue with priority
 * Refactored following SOLID principles:
 * - SRP: Each route and utility has single responsibility
 * - OCP: Easy to add new routes without modifying existing code
 * - DIP: Routes depend on abstractions (state interface)
 * 
 * @module orchestrator-server
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../../utils/logger.js';

import { createApp, startServer } from './server/express-server.js';
import { 
  initializeState, 
  processNext, 
  serverState,
  getStateData 
} from './server/state.js';

import {
  handleCommand,
  handleStatus,
  handleHealth,
  handleQueue,
  handleRestart
} from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('OmnySys:orchestrator:server');

/**
 * OrchestratorServer class
 */
export class OrchestratorServer {
  constructor(options = {}) {
    this.port = options.port || 9999;
    this.rootPath = options.rootPath || process.cwd();
    this.app = null;
    this.server = null;
  }

  /**
   * Initialize and start the server
   */
  async start() {
    logger.info(`🚀 Initializing Orchestrator Server on port ${this.port}...\n`);
    
    // Initialize state
    await initializeState(this.rootPath, () => this.updateState());
    
    // Create Express app
    this.app = createApp();
    this.setupRoutes();
    
    // Start server
    this.server = await startServer(this.app, this.port);
    
    logger.info(`✅ Orchestrator Server ready on port ${this.port}\n`);
    this.updateState();
    processNext(() => this.updateState());
    
    return this;
  }

  /**
   * Setup all routes
   */
  setupRoutes() {
    // POST /command - Queue or prioritize
    this.app.post('/command', (req, res) => 
      handleCommand(req, res, serverState, 
        () => processNext(() => this.updateState()),
        () => this.updateState()
      )
    );
    
    // GET /status - Get status
    this.app.get('/status', handleStatus);
    
    // GET /health - Health check
    this.app.get('/health', handleHealth);
    
    // GET /queue - View queue
    this.app.get('/queue', handleQueue);
    
    // POST /restart - Restart
    this.app.post('/restart', (req, res) =>
      handleRestart(req, res, 
        () => this.updateState(),
        () => processNext(() => this.updateState())
      )
    );
  }

  /**
   * Update shared state file
   */
  async updateState() {
    const stateData = getStateData();
    stateData.health = await this.getHealthStatus();
    await serverState.stateManager?.write(stateData);
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      llmConnection: 'ok',
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      lastError: null
    };
    
    if (serverState.worker && !serverState.worker.isHealthy()) {
      health.status = 'degraded';
      health.llmConnection = 'disconnected';
    }
    
    return health;
  }

  /**
   * Stop the server
   */
  async stop() {
    if (serverState.worker) {
      await serverState.worker.stop();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

/**
 * Legacy compatibility: Start server function
 */
export async function startOrchestratorServer(rootPath, port = 9999) {
  const server = new OrchestratorServer({ rootPath, port });
  return server.start();
}

export default OrchestratorServer;
