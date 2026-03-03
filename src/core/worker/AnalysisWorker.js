/**
 * @fileoverview AnalysisWorker.js
 * 
 * Worker that executes analysis using the existing indexer.
 * 
 * @module core/worker/AnalysisWorker
 */

import { createLogger } from '../../shared/logger-system.js';
import { WorkerState } from './WorkerState.js';
import { JobAnalyzer } from '../jobs/JobAnalyzer.js';

const logger = createLogger('OmnySys:core:analysis-worker');

/**
 * Worker that executes analysis
 */
export class AnalysisWorker {
  constructor(rootPath, options = {}, callbacks = {}) {
    // Handle both signatures
    if (typeof options === 'function' || options.onProgress || options.onComplete || options.onError) {
      callbacks = options;
      options = {};
    }

    this.rootPath = rootPath;
    this.callbacks = callbacks;
    this.options = options;
    this.state = new WorkerState();
    this.analyzedFiles = new Set();
  }

  /**
   * Initialize the worker
   */
  async initialize() {
    logger.info('Initializing AnalysisWorker...');
    this.state.setInitialized(true);
    logger.info('AnalysisWorker ready');
  }

  /**
   * Check if file was already analyzed
   */
  async isAnalyzed(filePath) {
    const { getFileAnalysis } = await import('../../layer-c-memory/query/apis/file-api.js');
    try {
      const analysis = await getFileAnalysis(this.rootPath, filePath);
      return analysis !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check worker health
   */
  isHealthy() {
    return this.state.isHealthy();
  }

  /**
   * Pause the worker
   */
  pause() {
    this.state.pause();
  }

  /**
   * Resume the worker
   */
  resume() {
    this.state.resume();
  }

  /**
   * Stop the worker
   */
  async stop() {
    this.state.stop();
    this._llmService = null;
    this._llmServiceReady = false;
  }

  /**
   * Analyze a file
   */
  async analyze(job) {
    const jobId = Math.random().toString(36).substring(2, 8);

    if (this.state.isPaused) {
      logger.debug(`[Worker:${jobId}] Worker is PAUSED`);
      return;
    }

    this.state.startJob();

    const analyzer = new JobAnalyzer(this.rootPath, this.callbacks, this);
    const result = await analyzer.analyze(job, jobId);

  }
}

export default AnalysisWorker;
