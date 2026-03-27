import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { estimateQueueTime } from '../orchestrator-server/utils/eta.js';
import {
  buildOrchestratorStateData,
  shouldPauseCurrentJob
} from './orchestrator-helpers.js';

const logger = createLogger('OmnySys:orchestrator');

export async function prioritizeFile(filePath, priority, requestId) {
  const isAnalyzed = await this.worker.isAnalyzed(filePath);
  if (isAnalyzed) {
    return {
      status: 'completed',
      filePath,
      requestId,
      message: 'Already analyzed'
    };
  }

  const position = this.queue.enqueue(filePath, priority);
  this.stats.totalQueued++;

  logger.info(`📥 Queued: ${path.basename(filePath)} [${priority}] at position ${position}`);

  if (priority === 'critical' && this.currentJob) {
    if (shouldPauseCurrentJob(this.currentJob.priority, priority)) {
      logger.info(`⏸️  Pausing current job to prioritize ${path.basename(filePath)}`);
      await this.worker.pause();
      this.queue.enqueue(this.currentJob.filePath, this.currentJob.priority);
      this.currentJob = null;
    }
  }

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
    logger.info('📭 Queue empty, waiting for jobs...');
    return;
  }

  logger.info(`⚡ Processing: ${path.basename(nextJob.filePath)} [${nextJob.priority}]`);
  this.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  await this.updateState();

  this.worker.analyze(nextJob);
}

export async function updateState() {
  if (!this.stateManager) return;

  await this.stateManager.write(buildOrchestratorStateData(this));
}

export async function restartOrchestrator() {
  logger.info('🔄 Restarting orchestrator...');
  await this.worker.stop();
  this.queue.resetQueue();
  this.currentJob = null;
  this.isRunning = true;
  await this.worker.initialize();
  await this.updateState();
  logger.info('✅ Orchestrator restarted');
}
