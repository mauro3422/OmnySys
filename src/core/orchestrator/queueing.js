import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:queueing');

// OPTIMIZATION: Default max concurrent analyses
// Increased from 2 to 10 since LLM execution is disabled, taking advantage of the static parser worker pool's capability
const DEFAULT_MAX_CONCURRENT = 10;

/**
* Analyze a file and wait for result
* Used by MCP tools when file is not yet analyzed
*/
export async function analyzeAndWait(filePath, timeoutMs = 60000) {
  // Check if already in queue
  const position = this.queue.findPosition(filePath);
  if (position >= 0) {
    logger.info(`â³ ${filePath} already in queue at position ${position}`);
  } else {
    // Enqueue as CRITICAL priority
    this.queue.enqueue(filePath, 'critical');
    logger.info(`ðŸš¨ ${filePath} queued as CRITICAL`);
  }

  // Trigger processing if we have capacity
  if (this.activeJobs < (this.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT)) {
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
    logger.debug('Orchestrator not running, skipping _processNext');
    return;
  }

  // Initialize activeJobs if not set
  if (typeof this.activeJobs !== 'number') {
    this.activeJobs = 0;
  }

  // OPTIMIZATION: Allow multiple concurrent jobs based on maxConcurrentAnalyses config
  const maxConcurrent = this.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT;

  logger.debug(`_processNext called - Active: ${this.activeJobs}, Max: ${maxConcurrent}, Queue: ${this.queue.size()}`);

  if (this.activeJobs >= maxConcurrent) {
    // All slots are busy, will be called again when a job completes
    logger.debug(`Queue full (${this.activeJobs}/${maxConcurrent}), waiting for slot...`);
    return;
  }

  const nextJob = this.queue.dequeue();
  if (!nextJob) {
    // No hay jobs, el loop se reactivará cuando se agregue uno nuevo
    logger.debug('Queue empty, no jobs to process');
    return;
  }

  // Increment active jobs counter FIRST
  this.activeJobs += 1;
  const jobSlot = this.activeJobs;

  // Eliminado log individual de job Starting para evitar ruido

  // Verify worker exists before calling
  if (!this.worker) {
    logger.error(`❌ FATAL: this.worker is NULL or UNDEFINED!`);
    this.activeJobs -= 1;
    return;
  }

  if (!this.worker.analyze) {
    logger.error(`❌ FATAL: this.worker.analyze is not a function!`);
    this.activeJobs -= 1;
    return;
  }

  // Ejecutar el job sin llamar al logger individual

  // Execute job without await to allow parallel processing
  this.worker.analyze(nextJob).then((result) => {
    this._onJobComplete(nextJob, result);
  }).catch((error) => {
    logger.error(`❌ Error processing job ${nextJob.filePath}:`, error.message);
    if (error.stack) {
      logger.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
    }
    this._onJobError(nextJob, error);
  });
}

export function _onJobProgress(job, progress) {
  this.currentJob = { ...job, progress };
  this.emit('job:progress', job, progress);
}

export function _onJobComplete(job, result) {
  this.stats.totalAnalyzed++;
  // Decrement active jobs counter
  this.activeJobs = Math.max(0, (this.activeJobs || 1) - 1);
  this.currentJob = null;
  this.indexedFiles.add(job.filePath);
  this.processedFiles.add(job.filePath);

  this.emit('job:complete', job, result);

  if (this.processedFiles.size % 50 === 0 && this.processedFiles.size > 0 && this.totalFilesToAnalyze > 50) {
    logger.debug(`   📊 Processed ${this.processedFiles.size}/${this.totalFilesToAnalyze} background files...`);
  }

  // Check if all files have been processed
  if (this.processedFiles.size >= this.totalFilesToAnalyze && this.totalFilesToAnalyze > 0) {
    logger.info(`\nðŸŽ‰ All ${this.totalFilesToAnalyze} files processed!`);
    this._finalizeAnalysis();
    return;
  }

  // OPTIMIZATION: Try to fill available slots with more jobs
  const maxConcurrent = this.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT;
  while (this.activeJobs < maxConcurrent && this.queue.size() > 0) {
    this._processNext();
  }

  // Check if main queue is empty and we should start iterative analysis
  if (this.queue.size() === 0 && !this.isIterating && this.iteration < this.maxIterations) {
    this._startIterativeAnalysis();
  } else if (this.queue.size() > 0 && this.activeJobs < maxConcurrent) {
    // Continuar con el siguiente job
    this._processNext();
  } else if (this.queue.size() > 0) {
    // Queue has jobs but all slots are full - will be called when a job completes
    logger.debug(`Waiting for slot - Queue: ${this.queue.size()}, Active: ${this.activeJobs}/${maxConcurrent}`);
  } else {
    // No hay más jobs ni iteraciones, finalizar
    this._finalizeAnalysis();
  }
}

export function _onJobError(job, error) {
  logger.error(`âŒ Job failed: ${job.filePath}`, error.message);
  // Decrement active jobs counter
  this.activeJobs = Math.max(0, (this.activeJobs || 1) - 1);
  this.currentJob = null;
  this.emit('job:error', job, error);

  // OPTIMIZATION: Try to fill the slot with another job
  const maxConcurrent = this.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT;
  if (this.queue.size() > 0 && this.activeJobs < maxConcurrent) {
    this._processNext();
  }
}
