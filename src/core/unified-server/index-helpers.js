import path from 'path';
import { AnalysisQueue } from '../analysis-queue.js';

export function buildUnifiedServerState(server, projectPath) {
  server.projectPath = projectPath;
  server.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
  server.cache = null;
  server.metadata = null;
  server.initialized = false;

  server.queue = new AnalysisQueue();
  server.worker = null;
  server.stateManager = null;
  server.currentJob = null;
  server.isRunning = true;
  server.startTime = Date.now();
  server.stats = {
    totalAnalyzed: 0,
    totalQueued: 0,
    avgTime: 0,
    cacheHitRate: 0
  };

  server.orchestratorApp = server.orchestratorApp || null;
  server.bridgeApp = server.bridgeApp || null;
  server.orchestratorServer = null;
  server.bridgeServer = null;
  server.ports = {
    orchestrator: process.env.ORCHESTRATOR_PORT || 9999,
    bridge: process.env.BRIDGE_PORT || 9998
  };

  server.fileWatcher = null;
  server.wsManager = null;
  server.batchProcessor = null;
}
