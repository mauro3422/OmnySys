/**
 * @fileoverview state.js
 * 
 * Server state management
 * 
 * @module orchestrator-server/server/state
 */

import { AnalysisQueue } from '../../analysis-queue.js';

// Estado global
export const state = {
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
export async function initialize(rootPath, logger, StateManager, AnalysisWorker, updateStateFn, processNextFn) {
  logger.info('🚀 Initializing OmnySys Orchestrator...\n');
  
  state.stateManager = new StateManager(
    rootPath + '/.omnysysdata/orchestrator-state.json'
  );
  
  state.worker = new AnalysisWorker(rootPath, {
    onProgress: (job, progress) => {
      state.currentJob = { ...job, progress };
      updateStateFn();
    },
    onComplete: (job, result) => {
      logger.info(`✅ Completed: ${job.filePath.split('/').pop()}`);
      state.stats.totalAnalyzed++;
      state.currentJob = null;
      updateStateFn();
      processNextFn();
    },
    onError: (job, error) => {
      logger.error(`❌ Error analyzing ${job.filePath.split('/').pop()}:`, error.message);
      state.currentJob = null;
      updateStateFn();
      processNextFn();
    }
  });
  
  await state.worker.initialize();
  
  logger.info('✅ Orchestrator ready\n');
  updateStateFn();
}

/**
 * Actualiza el archivo de estado compartido
 */
export async function updateState() {
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
export async function getHealthStatus() {
  const health = {
    status: 'healthy',
    llmConnection: 'ok',
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    lastError: null
  };
  
  if (state.worker && !state.worker.isHealthy()) {
    health.status = 'degraded';
    health.llmConnection = 'disconnected';
  }
  
  return health;
}

/**
 * Procesa el siguiente trabajo en la cola
 */
export async function processNext(logger) {
  if (!state.isRunning || state.currentJob) {
    return;
  }
  
  const nextJob = state.queue.dequeue();
  if (!nextJob) {
    logger.info('📭 Queue empty, waiting for jobs...');
    return;
  }
  
  logger.info(`⚡ Processing: ${nextJob.filePath.split('/').pop()} [${nextJob.priority}]`);
  state.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  await updateState();
  
  state.worker.analyze(nextJob);
}
