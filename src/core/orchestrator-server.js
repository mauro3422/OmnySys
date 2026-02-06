/**
 * orchestrator-server.js
 * Proceso independiente que gestiona la cola de análisis con prioridad
 * 
 * Características:
 * - HTTP API en puerto 9999
 * - Cola de prioridad: CRITICAL > HIGH > MEDIUM > LOW
 * - Estado compartido vía archivo JSON
 * - Pausa/reanudación de trabajos
 * - Health checks para la IA
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnalysisQueue } from './analysis-queue.js';
import { AnalysisWorker } from './analysis-worker.js';
import { StateManager } from './state-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Estado global
const state = {
  queue: new AnalysisQueue(),
  worker: null,
  stateManager: null,
  currentJob: null,
  stats: {
    totalAnalyzed: 0,
    totalQueued: 0,
    avgTime: 0,
    cacheHitRate: 0
  },
  startTime: Date.now(),
  isRunning: true
};

/**
 * Inicializa el orchestrator
 */
async function initialize(rootPath) {
  console.log('🚀 Initializing OmnySys Orchestrator...\n');
  
  // Inicializar StateManager
  state.stateManager = new StateManager(
    path.join(rootPath, '.OmnySysData', 'orchestrator-state.json')
  );
  
  // Inicializar worker
  state.worker = new AnalysisWorker(rootPath, {
    onProgress: (job, progress) => {
      state.currentJob = { ...job, progress };
      updateState();
    },
    onComplete: (job, result) => {
      console.log(`✅ Completed: ${path.basename(job.filePath)}`);
      state.stats.totalAnalyzed++;
      state.currentJob = null;
      updateState();
      processNext(); // Procesar siguiente en cola
    },
    onError: (job, error) => {
      console.error(`❌ Error analyzing ${path.basename(job.filePath)}:`, error.message);
      state.currentJob = null;
      updateState();
      processNext();
    }
  });
  
  await state.worker.initialize();
  
  console.log('✅ Orchestrator ready\n');
  updateState();
}

/**
 * Actualiza el archivo de estado compartido
 */
async function updateState() {
  const stateData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    orchestrator: {
      status: state.isRunning ? 'running' : 'paused',
      pid: process.pid,
      uptime: Math.floor((Date.now() - state.startTime) / 1000),
      port: 9999
    },
    currentJob: state.currentJob,
    queue: state.queue.getAll(),
    stats: state.stats,
    health: await getHealthStatus()
  };
  
  await state.stateManager.write(stateData);
}

/**
 * Obtiene estado de salud
 */
async function getHealthStatus() {
  const health = {
    status: 'healthy',
    llmConnection: 'ok',
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    lastError: null
  };
  
  // Verificar conexión LLM
  if (state.worker && !state.worker.isHealthy()) {
    health.status = 'degraded';
    health.llmConnection = 'disconnected';
  }
  
  return health;
}

/**
 * Procesa el siguiente trabajo en la cola
 */
async function processNext() {
  if (!state.isRunning || state.currentJob) {
    return; // Ya está procesando o está pausado
  }
  
  const nextJob = state.queue.dequeue();
  if (!nextJob) {
    console.log('📭 Queue empty, waiting for jobs...');
    return;
  }
  
  console.log(`⚡ Processing: ${path.basename(nextJob.filePath)} [${nextJob.priority}]`);
  state.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  await updateState();
  
  state.worker.analyze(nextJob);
}

// ============ HTTP API ENDPOINTS ============

/**
 * POST /command - Encolar o priorizar archivo
 */
app.post('/command', async (req, res) => {
  try {
    const { action, filePath, priority = 'low', requestId } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }
    
    if (action === 'prioritize') {
      // Verificar si ya está analizado
      const isAnalyzed = await state.worker.isAnalyzed(filePath);
      if (isAnalyzed) {
        return res.json({
          status: 'completed',
          filePath,
          requestId,
          message: 'Already analyzed'
        });
      }
      
      // Encolar con prioridad
      const position = state.queue.enqueue(filePath, priority);
      state.stats.totalQueued++;
      
      console.log(`📥 Queued: ${path.basename(filePath)} [${priority}] at position ${position}`);
      
      // Si es CRITICAL y hay un trabajo en curso de menor prioridad
      if (priority === 'critical' && state.currentJob) {
        const currentPriority = getPriorityLevel(state.currentJob.priority);
        const newPriority = getPriorityLevel(priority);
        
        if (newPriority > currentPriority) {
          console.log(`⏸️  Pausing current job to prioritize ${path.basename(filePath)}`);
          await state.worker.pause();
          state.queue.enqueue(state.currentJob.filePath, state.currentJob.priority);
          state.currentJob = null;
        }
      }
      
      // Iniciar procesamiento si no hay trabajo en curso
      if (!state.currentJob) {
        processNext();
      }
      
      await updateState();
      
      res.json({
        status: position === 0 ? 'analyzing' : 'queued',
        filePath,
        priority,
        position,
        estimatedTime: calculateETA(position),
        requestId
      });
      
    } else if (action === 'pause') {
      state.isRunning = false;
      await state.worker.pause();
      await updateState();
      res.json({ status: 'paused' });
      
    } else if (action === 'resume') {
      state.isRunning = true;
      await updateState();
      processNext();
      res.json({ status: 'resumed' });
      
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
    
  } catch (error) {
    console.error('Error in /command:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status - Obtener estado actual
 */
app.get('/status', async (req, res) => {
  try {
    const stateData = await state.stateManager.read();
    res.json(stateData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health - Health check para IA
 */
app.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

/**
 * GET /queue - Ver cola completa
 */
app.get('/queue', async (req, res) => {
  res.json({
    current: state.currentJob,
    queue: state.queue.getAll(),
    total: state.queue.size()
  });
});

/**
 * POST /restart - Reiniciar orchestrator
 */
app.post('/restart', async (req, res) => {
  console.log('🔄 Restarting orchestrator...');
  
  try {
    await state.worker.stop();
    state.queue.clear();
    state.currentJob = null;
    state.isRunning = true;
    
    await state.worker.initialize();
    await updateState();
    
    console.log('✅ Orchestrator restarted');
    res.json({ status: 'restarted' });
    
  } catch (error) {
    console.error('Error restarting:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ HELPERS ============

function getPriorityLevel(priority) {
  const levels = { critical: 4, high: 3, medium: 2, low: 1 };
  return levels[priority] || 0;
}

function calculateETA(position) {
  const avgTime = state.stats.avgTime || 3000;
  return position * avgTime;
}

// ============ STARTUP ============

const PORT = process.env.ORCHESTRATOR_PORT || 9999;
const ROOT_PATH = process.argv[2] || process.cwd();

app.listen(PORT, async () => {
  console.log(`\n🔧 OmnySys Orchestrator v1.0.0`);
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`📁 Project: ${ROOT_PATH}\n`);
  
  await initialize(ROOT_PATH);
  
  // Empezar procesamiento
  processNext();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down orchestrator...');
  state.isRunning = false;
  if (state.worker) {
    await state.worker.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down orchestrator...');
  state.isRunning = false;
  if (state.worker) {
    await state.worker.stop();
  }
  process.exit(0);
});
