/**
 * @fileoverview State Management for Orchestrator Server
 * 
 * SSOT: Centralized state management for the orchestrator
 * Single Responsibility: Manage server state only
 * 
 * @module orchestrator-server/server/state
 */

import { AnalysisQueue } from '../../analysis-queue.js';
import { AnalysisWorker } from '../../worker/AnalysisWorker.js';
import { StateManager as FileStateManager } from '../../state-manager.js';
import path from 'path';

/**
 * Server state container
 */
export const serverState = {
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
  isRunning: true,
  rootPath: null
};

/**
 * Initialize server state
 * @param {string} rootPath - Project root path
 * @param {Function} updateCallback - Callback when state changes
 */
export async function initializeState(rootPath, updateCallback) {
  serverState.rootPath = rootPath;
  
  // Initialize StateManager
  serverState.stateManager = new FileStateManager(
    path.join(rootPath, '.omnysysdata', 'orchestrator-state.json')
  );
  
  // Initialize worker
  serverState.worker = new AnalysisWorker(rootPath, {
    onProgress: (job, progress) => {
      serverState.currentJob = { ...job, progress };
      updateCallback();
    },
    onComplete: (job, result) => {
      serverState.stats.totalAnalyzed++;
      serverState.currentJob = null;
      updateCallback();
      processNext(updateCallback);
    },
    onError: (job, error) => {
      serverState.currentJob = null;
      updateCallback();
      processNext(updateCallback);
    }
  });
  
  await serverState.worker.initialize();
  updateCallback();
}

/**
 * Process next job in queue
 * @param {Function} updateCallback - Callback when state changes
 */
export async function processNext(updateCallback) {
  if (!serverState.isRunning || serverState.currentJob) {
    return;
  }
  
  const nextJob = serverState.queue.dequeue();
  if (!nextJob) {
    return;
  }
  
  serverState.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  updateCallback();
  
  serverState.worker.analyze(nextJob);
}

/**
 * Get health status
 * @returns {Promise<Object>} Health status
 */
export async function getHealthStatus() {
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
 * Pause the orchestrator
 */
export async function pause() {
  serverState.isRunning = false;
  if (serverState.worker) {
    await serverState.worker.pause();
  }
}

/**
 * Resume the orchestrator
 */
export async function resume() {
  serverState.isRunning = true;
}

/**
 * Restart the orchestrator
 * @param {Function} updateCallback - Callback when state changes
 */
export async function restart(updateCallback) {
  if (serverState.worker) {
    await serverState.worker.stop();
  }
  serverState.queue.clear();
  serverState.currentJob = null;
  serverState.isRunning = true;
  
  await serverState.worker.initialize();
  updateCallback();
  processNext(updateCallback);
}

/**
 * Calculate ETA for a job position
 * @param {number} position - Position in queue
 * @returns {number} Estimated time in ms
 */
export function calculateETA(position) {
  const avgTime = serverState.stats.avgTime || 3000;
  return position * avgTime;
}

/**
 * Get complete state for serialization
 * @returns {Object} State object
 */
export function getStateData() {
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    orchestrator: {
      status: serverState.isRunning ? 'running' : 'paused',
      pid: process.pid,
      uptime: Math.floor((Date.now() - serverState.startTime) / 1000),
      port: 9999
    },
    currentJob: serverState.currentJob,
    queue: serverState.queue.getAll(),
    stats: serverState.stats
  };
}
