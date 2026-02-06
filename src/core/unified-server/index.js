import express from 'express';
import path from 'path';
import { EventEmitter } from 'events';

import { AnalysisQueue } from '../analysis-queue.js';

import * as init from './initialization/index.js';
import * as api from './api.js';
import * as orchestrator from './orchestrator.js';
import * as tools from './tools.js';
import { printStatus } from './status.js';
import { shutdown } from './lifecycle.js';

class OmnySysUnifiedServer extends EventEmitter {
  constructor(projectPath) {
    super();
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
    this.cache = null;  // Initialized in initializeMCP()
    this.metadata = null;
    this.initialized = false;

    // Orchestrator components
    this.queue = new AnalysisQueue();
    this.worker = null;
    this.stateManager = null;
    this.currentJob = null;
    this.isRunning = true;
    this.startTime = Date.now();
    this.stats = {
      totalAnalyzed: 0,
      totalQueued: 0,
      avgTime: 0,
      cacheHitRate: 0
    };

    // Server instances
    this.orchestratorApp = express();
    this.bridgeApp = express();
    this.orchestratorServer = null;
    this.bridgeServer = null;
    this.ports = {
      orchestrator: process.env.ORCHESTRATOR_PORT || 9999,
      bridge: process.env.BRIDGE_PORT || 9998
    };

    // File Watcher
    this.fileWatcher = null;

    // WebSocket Manager (nativo)
    this.wsManager = null;

    // Batch Processor para cambios concurrentes
    this.batchProcessor = null;
  }
}

Object.assign(
  OmnySysUnifiedServer.prototype,
  init,
  api,
  orchestrator,
  tools,
  { printStatus, shutdown }
);

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const server = new OmnySysUnifiedServer(projectPath);

  // Handle graceful shutdown
  process.on('SIGTERM', () => server.shutdown());
  process.on('SIGINT', () => server.shutdown());

  try {
    await server.initialize();

    // Keep alive
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { OmnySysUnifiedServer, main };
