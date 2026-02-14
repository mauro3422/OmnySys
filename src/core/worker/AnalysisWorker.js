/**
 * @fileoverview AnalysisWorker.js
 * 
 * Worker that executes analysis using the existing indexer.
 * 
 * @module core/worker/AnalysisWorker
 */

import { createLogger } from '../../shared/logger-system.js';
import { LLMService } from '../../services/llm-service.js';
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
    
    this._llmService = options.llmService || null;
    this._llmServiceReady = false;
  }

  /**
   * @deprecated Use llmService instead of llmAnalyzer
   */
  get llmAnalyzer() {
    logger.debug('⚠️  [DEPRECATED] Accessing llmAnalyzer, use llmService instead');
    return this._llmService;
  }

  /**
   * @deprecated Service is injected in constructor
   */
  set llmAnalyzer(analyzer) {
    logger.debug('⚠️  [DEPRECATED] Setting llmAnalyzer is deprecated');
  }

  /**
   * Get LLM service (lazy initialization)
   * @private
   */
  async _getLLMService() {
    if (this._llmService && this._llmServiceReady) {
      return this._llmService;
    }
    
    if (!this._llmService) {
      this._llmService = await LLMService.getInstance();
    }
    
    const available = await this._llmService.waitForAvailable(5000);
    this._llmServiceReady = available;
    
    return available ? this._llmService : null;
  }

  /**
   * Initialize the worker
   */
  async initialize() {
    logger.info('Initializing AnalysisWorker...');
    
    if (!this._llmService) {
      try {
        this._llmService = await LLMService.getInstance();
        logger.info('✅ LLMService obtained');
      } catch (err) {
        logger.warn('⚠️  Could not pre-initialize LLMService:', err.message);
      }
    }
    
    this.state.setInitialized(true);
    logger.info('AnalysisWorker ready');
  }

  /**
   * Check if file was already analyzed
   */
  async isAnalyzed(filePath) {
    const { getFileAnalysis } = await import('../../layer-a-static/query/apis/file-api.js');
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
    console.log(`[Worker:${jobId}] ✅ START analyze() for ${job.filePath}`);
    
    if (this.state.isPaused) {
      console.log(`[Worker:${jobId}] Worker is PAUSED`);
      return;
    }

    this.state.startJob();
    
    const analyzer = new JobAnalyzer(this.rootPath, this.callbacks, this);
    const result = await analyzer.analyze(job, jobId);
    
    this.state.endJob();
    return result;
  }

  /**
   * Analyze files using LLM
   * @private
   */
  async _analyzeWithLLM(llmService, files) {
    const { LLMAnalyzer } = await import('../../layer-b-semantic/llm-analyzer/index.js');
    const { loadAIConfig } = await import('../../ai/llm-client.js');
    
    const aiConfig = await loadAIConfig();
    const analyzer = new LLMAnalyzer(aiConfig, this.rootPath);
    
    if (llmService.client) {
      analyzer.client = llmService.client;
      analyzer.initialized = true;
    } else {
      await analyzer.initialize();
    }
    
    return analyzer.analyzeMultiple(files);
  }
}

export default AnalysisWorker;
