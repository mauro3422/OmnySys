/**
 * @fileoverview JobAnalyzer.js
 * 
 * Analyzes individual jobs.
 * 
 * @module core/jobs/JobAnalyzer
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../shared/logger-system.js';

const logger = createLogger('OmnySys:core:job-analyzer');

/**
 * Analyzes individual jobs
 */
export class JobAnalyzer {
  constructor(rootPath, callbacks, worker) {
    this.rootPath = rootPath;
    this.callbacks = callbacks;
    this.worker = worker;
  }

  /**
   * Analyze a job
   */
  async analyze(job, jobId) {
    const signal = this.worker.state.currentJob?.signal;

    try {
      this.callbacks.onProgress?.(job, 10);

      // Step 1: Re-analyze with Layer A
      await this.runLayerAAnalysis(job);
      
      this.callbacks.onProgress?.(job, 50);

      let result;

      // Step 2: LLM analysis if needed
      if (job.needsLLM) {
        result = await this.runLLMAnalysis(job, signal, jobId);
      } else {
        result = await this.runStaticAnalysis(job);
      }

      if (signal?.aborted) {
        throw new Error('Analysis aborted');
      }

      this.callbacks.onProgress?.(job, 100);
      this.worker.analyzedFiles.add(job.filePath);
      
      logger.info(`✅ Analysis complete for ${path.basename(job.filePath)}`);
      this.callbacks.onComplete?.(job, result);
      
      return result;

    } catch (error) {
      if (error.message === 'Analysis aborted') {
        logger.info(`⏹️  Analysis aborted for ${job.filePath}`);
      } else {
        logger.error(`❌ Analysis failed for ${job.filePath}:`, error);
        this.callbacks.onError?.(job, error);
      }
      throw error;
    }
  }

  /**
   * Run Layer A static analysis
   */
  async runLayerAAnalysis(job) {
    logger.info(`📊 Re-analyzing with Layer A: ${path.basename(job.filePath)}`);
    try {
      const { analyzeSingleFile } = await import('../../layer-a-static/pipeline/single-file.js');
      const layerAResult = await analyzeSingleFile(this.rootPath, job.filePath, {
        verbose: false,
        incremental: true
      });

      job.fileAnalysis = {
        ...job.fileAnalysis,
        ...layerAResult,
        reanalyzedAt: new Date().toISOString()
      };

      logger.info(`   ✅ Layer A analysis complete`);
    } catch (layerAError) {
      logger.warn(`   ⚠️  Layer A analysis failed: ${layerAError.message}`);
    }
  }

  /**
   * Run static analysis only
   */
  async runStaticAnalysis(job) {
    logger.info(`📊 Using static analysis for ${path.basename(job.filePath)}`);
    const { getFileAnalysis } = await import('../../layer-c-memory/query/apis/file-api.js');
    return await getFileAnalysis(this.rootPath, job.filePath);
  }

  /**
   * Run LLM analysis
   */
  async runLLMAnalysis(job, signal, jobId) {
    logger.info(`🤖 Using LLM analysis for ${path.basename(job.filePath)}`);
    
    const llmService = await this.worker._getLLMService();
    console.log(`[Worker:${jobId}] LLM service = ${!!llmService}`);
    
    if (!llmService) {
      logger.warn(`   ⚠️  LLM not available, using static analysis only`);
      return await this.runStaticAnalysis(job);
    }

    const { buildPromptMetadata } = await import('../../layer-b-semantic/metadata-contract.js');
    const { saveFileAnalysis } = await import('#layer-c/storage/index.js');

    const promptMetadata = buildPromptMetadata(job.filePath, job.fileAnalysis);
    const code = await this.getFileCode(job);

    const llmResults = await this.worker._analyzeWithLLM(llmService, [{
      filePath: job.filePath,
      code,
      staticAnalysis: job.fileAnalysis?.semanticAnalysis,
      metadata: promptMetadata,
      analysisType: job.archetypes?.[0] || 'default'
    }]);

    if (signal?.aborted) {
      throw new Error('Analysis aborted');
    }

    const llmResult = llmResults[0] || this.createEmptyResult(job);

    const mergedResult = {
      ...job.fileAnalysis,
      llmInsights: {
        ...llmResult,
        analyzedAt: new Date().toISOString()
      },
      analysisComplete: true
    };

    await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);
    return mergedResult;
  }

  /**
   * Get file code content
   */
  async getFileCode(job) {
    if (job.fileAnalysis?.content) {
      return job.fileAnalysis.content;
    }
    try {
      const absolutePath = path.join(this.rootPath, job.filePath);
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (readError) {
      logger.warn(`   ⚠️  Could not read file: ${readError.message}`);
      return '';
    }
  }

  /**
   * Create empty result for failed LLM
   */
  createEmptyResult(job) {
    return {
      confidence: 0.0,
      reasoning: 'LLM returned no usable data',
      analysisType: job.archetypes?.[0] || 'default',
      suggestedConnections: [],
      hiddenConnections: []
    };
  }
}

export default JobAnalyzer;
