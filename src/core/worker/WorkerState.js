/**
 * @fileoverview WorkerState.js
 * 
 * Manages worker state and lifecycle.
 * 
 * @module core/worker/WorkerState
 */

/**
 * Manages worker state
 */
export class WorkerState {
  constructor() {
    this.isInitialized = false;
    this.isPaused = false;
    this.currentJob = null;
    this.jobCount = 0;
  }

  /**
   * Set initialization state
   */
  setInitialized(value) {
    this.isInitialized = value;
  }

  /**
   * Check if worker is healthy
   */
  isHealthy() {
    return this.isInitialized && !this.isPaused;
  }

  /**
   * Pause worker
   */
  pause() {
    this.isPaused = true;
    if (this.currentJob?.abortController) {
      this.currentJob.abortController.abort();
    }
  }

  /**
   * Resume worker
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Stop worker
   */
  stop() {
    this.isInitialized = false;
    this.isPaused = false;
    if (this.currentJob?.abortController) {
      this.currentJob.abortController.abort();
    }
    this.currentJob = null;
  }

  /**
   * Start a job
   */
  startJob() {
    this.currentJob = {
      startTime: Date.now(),
      abortController: new AbortController()
    };
    this.jobCount++;
  }

  /**
   * End current job
   */
  endJob() {
    this.currentJob = null;
  }
}

export default WorkerState;
