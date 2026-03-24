import { createLogger } from '../../utils/logger.js';
import { estimateQueueTime } from '../orchestrator-server/utils/eta.js';

const logger = createLogger('OmnySys:orchestrator');


﻿import path from 'path';

// ============================================================
// Orchestrator Logic
// ============================================================

export async function prioritizeFile(filePath, priority, requestId) {
  // Check if already analyzed
  const isAnalyzed = await this.worker.isAnalyzed(filePath);
  if (isAnalyzed) {
    return {
      status: 'completed',
      filePath,
      requestId,
      message: 'Already analyzed'
    };
  }

  // Add to queue
  const position = this.queue.enqueue(filePath, priority);
  this.stats.totalQueued++;

  logger.info(`ðŸ“¥ Queued: ${path.basename(filePath)} [${priority}] at position ${position}`);

  // If CRITICAL and lower priority job running, pause it
  if (priority === 'critical' && this.currentJob) {
    const currentPriority = this.resolvePriorityLevel(this.currentJob.priority);
    const newPriority = this.resolvePriorityLevel(priority);

    if (newPriority > currentPriority) {
      logger.info(`â¸ï¸  Pausing current job to prioritize ${path.basename(filePath)}`);
      await this.worker.pause();
      this.queue.enqueue(this.currentJob.filePath, this.currentJob.priority);
      this.currentJob = null;
    }
  }

  // Start processing if idle
  if (!this.currentJob) {
    this.advanceQueue();
  }

  await this.updateState();

  return {
    status: position === 0 ? 'analyzing' : 'queued',
    filePath,
    priority,
    position,
    estimatedTime: estimateQueueTime(position, this.stats.avgTime),
    requestId
  };
}

export async function advanceQueue() {
  if (!this.isRunning || this.currentJob) {
    return;
  }

  const nextJob = this.queue.dequeue();
  if (!nextJob) {
    logger.info('ðŸ“­ Queue empty, waiting for jobs...');
    return;
  }

  logger.info(`âš¡ Processing: ${path.basename(nextJob.filePath)} [${nextJob.priority}]`);
  this.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  await this.updateState();

  this.worker.analyze(nextJob);
}

export async function updateState() {
  if (!this.stateManager) return;

  const stateData = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    orchestrator: {
      status: this.isRunning ? 'running' : 'paused',
      pid: process.pid,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      port: this.ports.orchestrator
    },
    currentJob: this.currentJob,
    queue: this.queue.getQueueSnapshot(),
    stats: this.stats,
    health: {
      status: 'healthy',
      llmConnection: this.worker?.isHealthy() ? 'ok' : 'disconnected',
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      lastError: null
    }
  };

  await this.stateManager.write(stateData);
}

export function resolvePriorityLevel(priority) {
  const levels = { critical: 4, high: 3, medium: 2, low: 1 };
  return levels[priority] || 0;
}

export async function restartOrchestrator() {
  logger.info('ðŸ”„ Restarting orchestrator...');
  await this.worker.stop();
  this.queue.resetQueue();
  this.currentJob = null;
  this.isRunning = true;
  await this.worker.initialize();
  await this.updateState();
  logger.info('âœ… Orchestrator restarted');
}
