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

      const result = await this.runStaticAnalysis(job);

      if (signal?.aborted) {
        throw new Error('Analysis aborted');
      }

      this.callbacks.onProgress?.(job, 100);
      this.worker.analyzedFiles.add(job.filePath);

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
    try {
      const { analyzeSingleFile } = await import('../../layer-a-static/pipeline/single-file.js');
      const relativePath = path.isAbsolute(job.filePath) ? path.relative(this.rootPath, job.filePath) : job.filePath;
      const layerAResult = await analyzeSingleFile(this.rootPath, relativePath, {
        verbose: false,
        incremental: false // Phase 2 lazy indexing requires deep re-extraction regardless of hash match
      }, 'deep');

      job.fileAnalysis = {
        ...job.fileAnalysis,
        ...layerAResult,
        reanalyzedAt: new Date().toISOString()
      };

    } catch (layerAError) {
      logger.warn(`   ⚠️  Layer A analysis failed: ${layerAError.message}`);
    }
  }

  /**
   * Run static analysis only
   */
  async runStaticAnalysis(job) {
    const { getFileAnalysis } = await import('../../layer-c-memory/query/apis/file-api.js');
    const relativePath = path.isAbsolute(job.filePath) ? path.relative(this.rootPath, job.filePath) : job.filePath;
    return await getFileAnalysis(this.rootPath, relativePath);
  }
}

export default JobAnalyzer;
