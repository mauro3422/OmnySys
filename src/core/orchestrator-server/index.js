/**
 * orchestrator-server.js
 * Main entry point (backward compatible)
 * 
 * Proceso independiente que gestiona la cola de análisis con prioridad
 * 
 * Características:
 * - HTTP API en puerto 9999
 * - Cola de prioridad: CRITICAL > HIGH > MEDIUM > LOW
 * - Estado compartido vía archivo JSON
 * - Pausa/reanudación de trabajos
 * - Health checks para la IA
 * 
 * @module core/orchestrator-server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnalysisQueue } from './analysis-queue.js';
import { AnalysisWorker } from './analysis-worker.js';
import { StateManager } from './state-manager.js';
import { createLogger } from '../utils/logger.js';

// Import modular handlers
import { initialize, state, updateState, processNext } from './server/state.js';
import { handleCommand } from './routes/command.js';
import { handleStatus, handleHealth, handleQueue, handleRestart } from './routes/status.js';
import { setupShutdownHandlers } from './handlers/shutdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize state with required classes
state.queue = new AnalysisQueue();

const logger = createLogger('OmnySys:orchestrator:server');

// ============ HTTP API ENDPOINTS ============

app.post('/command', (req, res) => handleCommand(req, res, logger));
app.get('/status', handleStatus);
app.get('/health', handleHealth);
app.get('/queue', handleQueue);
app.post('/restart', (req, res) => handleRestart(req, res, logger));

// ============ STARTUP ============

const PORT = process.env.ORCHESTRATOR_PORT || 9999;
const ROOT_PATH = process.argv[2] || process.cwd();

app.listen(PORT, async () => {
  logger.info(`\n🔧 OmnySys Orchestrator v1.0.0`);
  logger.info(`📡 HTTP API: http://localhost:${PORT}`);
  logger.info(`📁 Project: ${ROOT_PATH}\n`);
  
  await initialize(ROOT_PATH, logger, StateManager, AnalysisWorker, updateState, 
    () => processNext(logger));
  
  processNext(logger);
});

// Graceful shutdown
setupShutdownHandlers(logger);

export { state, initialize, updateState, processNext };
