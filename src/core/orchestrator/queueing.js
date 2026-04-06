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

  // Verify worker exists before calling.
  // In isolated tests/shutdown windows worker may be temporarily unavailable.
  if (!this.worker || typeof this.worker.analyze !== 'function') {
    logger.debug(`Worker unavailable, re-queueing ${nextJob.filePath}`);
    this.activeJobs = Math.max(0, this.activeJobs - 1);
    this.queue.enqueueJob(nextJob, nextJob.priority || 'critical');
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

function _emitPhase2Progress(orchestrator, processed, total) {
  const percentage = Math.floor((processed / total) * 100);
  const isInitialMilestone = processed === 1 || processed === 10;
  const isStepMilestone = processed % 20 === 0 || (percentage > 0 && percentage % 5 === 0);

  if (isInitialMilestone || isStepMilestone || processed === total) {
    const progressBarWidth = 20;
    const progressSegments = Math.min(progressBarWidth, Math.max(processed > 0 ? 1 : 0, Math.floor((processed / total) * progressBarWidth)));
    const bar = '='.repeat(progressSegments) + '>'.repeat(progressSegments < progressBarWidth ? 1 : 0) + ' '.repeat(Math.max(0, progressBarWidth - progressSegments - 1));
    logger.info(`📊 Phase 2: [${bar}] ${percentage}% (${processed}/${total} files)`);
    if (processed === total && total > 0) {
      logger.info('✅ Phase 2 Background Analysis Complete!');
    }
  } else {
    logger.debug(`   ✅ Completed: ${processed}/${total}`);
  }
}

function _tryFillAvailableSlots(orchestrator) {
  const maxConcurrent = orchestrator.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT;
  while (orchestrator.activeJobs < maxConcurrent && orchestrator.queue.size() > 0) {
    orchestrator._processNext();
  }
}

function _determineNextAction(orchestrator) {
  const maxConcurrent = orchestrator.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT;
  const allProcessed = orchestrator.processedFiles.size >= orchestrator.totalFilesToAnalyze && orchestrator.totalFilesToAnalyze > 0;

  if (allProcessed) {
    logger.info(`\n🎉 All ${orchestrator.totalFilesToAnalyze} files processed!`);
    orchestrator._finalizeAnalysis();
    return;
  }
  if (orchestrator.queue.size() === 0 && !orchestrator.isIterating && orchestrator.iteration < orchestrator.maxIterations) {
    orchestrator._startIterativeAnalysis();
  } else if (orchestrator.queue.size() > 0 && orchestrator.activeJobs < maxConcurrent) {
    orchestrator._processNext();
  } else if (orchestrator.queue.size() > 0) {
    logger.debug(`Waiting for slot - Queue: ${orchestrator.queue.size()}, Active: ${orchestrator.activeJobs}/${maxConcurrent}`);
  } else if (orchestrator.totalFilesToAnalyze > 0 && orchestrator.processedFiles.size < orchestrator.totalFilesToAnalyze) {
    logger.debug(`Queue empty but waiting for more files: ${orchestrator.processedFiles.size}/${orchestrator.totalFilesToAnalyze}`);
  } else {
    orchestrator._finalizeAnalysis();
  }
}

export function _onJobComplete(job, result) {
  this.stats.totalAnalyzed++;
  this.activeJobs = Math.max(0, (this.activeJobs || 1) - 1);
  this.currentJob = null;
  this.indexedFiles.add(job.filePath);
  this.processedFiles.add(job.filePath);
  this.emit('job:complete', job, result);

  if (result) this._runPipelineGuard(job.filePath, result);

  if (this.totalFilesToAnalyze > 0) {
    _emitPhase2Progress(this, this.processedFiles.size, this.totalFilesToAnalyze);
  }

  _determineNextAction(this);
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
