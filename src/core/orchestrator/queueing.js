import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:queueing');


﻿/**
 * Analyze a file and wait for result
 * Used by MCP tools when file is not yet analyzed
 */
export async function analyzeAndWait(filePath, timeoutMs = 60000) {
  // Check if already in queue
  const position = this.queue.findPosition(filePath);
  if (position >= 0) {
    logger.info(`â³ ${filePath} already in queue at position ${position}`);
  } else {
    // Enqueue as CRITICAL priority
    this.queue.enqueue(filePath, 'critical');
    logger.info(`ðŸš¨ ${filePath} queued as CRITICAL`);
  }

  // Trigger processing if idle
  if (!this.currentJob) {
    this._processNext();
  }

  // Wait for analysis to complete
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for analysis of ${filePath}`));
    }, timeoutMs);

    const onComplete = (job, result) => {
      if (job.filePath === filePath) {
        clearTimeout(timeout);
        this.off('job:complete', onComplete);
        resolve(result);
      }
    };

    this.on('job:complete', onComplete);
  });
}

export async function _processNext() {
  if (!this.isRunning) {
    return;
  }

  // Si ya hay un job en progreso, no hacer nada
  if (this.currentJob) {
    return;
  }

  const nextJob = this.queue.dequeue();
  if (!nextJob) {
    // No hay jobs, el loop se reactivará cuando se agregue uno nuevo
    return;
  }

  this.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  this.emit('job:started', this.currentJob);

  try {
    await this.worker.analyze(nextJob);
  } catch (error) {
    logger.error(`âŒ Error processing job ${nextJob.filePath}:`, error.message);
    this._onJobError(nextJob, error);
  }
}

export function _onJobProgress(job, progress) {
  this.currentJob = { ...job, progress };
  this.emit('job:progress', job, progress);
}

export function _onJobComplete(job, result) {
  this.stats.totalAnalyzed++;
  this.currentJob = null;
  this.indexedFiles.add(job.filePath);
  this.processedFiles.add(job.filePath);

  this.emit('job:complete', job, result);

  logger.info(`   âœ… Completed: ${job.filePath} (${this.processedFiles.size}/${this.totalFilesToAnalyze})`);

  // Check if all files have been processed
  if (this.processedFiles.size >= this.totalFilesToAnalyze && this.totalFilesToAnalyze > 0) {
    logger.info(`\nðŸŽ‰ All ${this.totalFilesToAnalyze} files processed!`);
    this._finalizeAnalysis();
    return;
  }

  // Check if main queue is empty and we should start iterative analysis
  if (this.queue.size() === 0 && !this.isIterating && this.iteration < this.maxIterations) {
    this._startIterativeAnalysis();
  } else if (this.queue.size() > 0) {
    // Continuar con el siguiente job
    this._processNext();
  } else {
    // No hay más jobs ni iteraciones, finalizar
    this._finalizeAnalysis();
  }
}

export function _onJobError(job, error) {
  logger.error(`âŒ Job failed: ${job.filePath}`, error.message);
  this.currentJob = null;
  this.emit('job:error', job, error);

  // Continuar con el siguiente job a pesar del error
  this._processNext();
}
