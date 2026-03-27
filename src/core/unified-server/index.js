import express from 'express';
import { EventEmitter } from 'events';

import * as init from './initialization/index.js';
import * as api from './api.js';
import * as orchestrator from './orchestrator.js';
import * as tools from './tools/index.js';
import { printStatus } from './status.js';
import { shutdown } from './lifecycle.js';
import { createLogger } from '../../utils/logger.js';
import { createCliOrchestrator } from '../../shared/cli/base-orchestrator.js';
import { buildUnifiedServerState } from './index-helpers.js';



class OmnySysUnifiedServer extends EventEmitter {
  constructor(projectPath) {
    super();
    this.orchestratorApp = express();
    this.bridgeApp = express();
    buildUnifiedServerState(this, projectPath);
  }
}

function logUnifiedServerError(message, error) {
  const logger = createLogger('OmnySys:unified-server');
  logger.error(message, error);
}

Object.assign(
  OmnySysUnifiedServer.prototype,
  init,
  api,
  orchestrator,
  tools,
  { printStatus, shutdown }
);

let globalServerInstance = null;

async function safeShutdownCurrentServer() {
  if (!globalServerInstance) {
    return;
  }

  try {
    await globalServerInstance.shutdown();
  } catch (error) {
    logUnifiedServerError('Shutdown failed during interrupt handling', error);
  } finally {
    globalServerInstance = null;
  }
}

async function safeStartUnifiedServer(absolutePath) {
  try {
    globalServerInstance = new OmnySysUnifiedServer(absolutePath);
    await globalServerInstance.initialize();
  } catch (error) {
    globalServerInstance = null;
    logUnifiedServerError('Unified server bootstrap failed', error);
    throw error;
  }
}

const main = createCliOrchestrator({
  name: 'unified-server',
  logger: createLogger,
  keepAlive: true,
  onInterrupt: safeShutdownCurrentServer,
  run: async ({ absolutePath }) => safeStartUnifiedServer(absolutePath)
});

export { OmnySysUnifiedServer, main };

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
