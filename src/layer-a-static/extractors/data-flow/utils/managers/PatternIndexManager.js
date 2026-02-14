/**
 * @fileoverview PatternIndexManager.js
 * 
 * Manages pattern index for ML.
 * Hybrid approach: atom data in runtime, pattern index for ML training.
 * 
 * @module data-flow/utils/managers/PatternIndexManager
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '../../../../../utils/logger.js';
import { MasterIndexer } from '../indexers/MasterIndexer.js';
import { PatternDirectoryManager } from './PatternDirectoryManager.js';
import { TrainingDatasetManager } from './TrainingDatasetManager.js';
import { TokenSummarizer, GraphSummarizer, StatisticsCalculator } from './DataSummarizers.js';

const logger = createLogger('OmnySys:pattern:index:manager');

/**
 * Manages pattern index for ML
 */
export class PatternIndexManager {
  constructor(basePath = '.omnysysdata/patterns') {
    this.basePath = basePath;
    this.indexPath = path.join(basePath, 'index.json');
    this.ensureDirectory();

    this.masterIndexer = new MasterIndexer(this.indexPath);
    this.directoryManager = new PatternDirectoryManager(basePath);
    this.datasetManager = new TrainingDatasetManager(basePath);
  }

  ensureDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Update index with a new atom
   */
  async updateIndex(standardized, atomData) {
    try {
      const { patternHash, pattern, tokens, flowType, mlFeatures } = standardized;
      const { atomId, graph } = atomData;

      await this.updateMasterIndex(patternHash, {
        pattern,
        flowType,
        tokenSummary: TokenSummarizer.summarize(tokens),
        featureSummary: mlFeatures
      });

      await this.directoryManager.update(patternHash, {
        pattern,
        tokens,
        flowType,
        mlFeatures,
        atomId,
        graph
      });

      await this.datasetManager.update(patternHash, {
        atomId,
        pattern,
        tokens,
        mlFeatures,
        graph: GraphSummarizer.summarize(graph)
      });

    } catch (error) {
      logger.warn('[PatternIndexManager] Error:', error.message);
    }
  }

  /**
   * Update master index
   */
  async updateMasterIndex(patternHash, metadata) {
    await this.masterIndexer.update(patternHash, metadata);
  }

  /**
   * Find similar atoms by hash
   */
  async findSimilar(patternHash, limit = 10) {
    return this.directoryManager.findAtoms(patternHash, limit);
  }

  /**
   * Get all patterns
   */
  async getAllPatterns() {
    return this.masterIndexer.getAllPatterns();
  }

  /**
   * Export training dataset
   */
  async exportTrainingDataset(domain, outputPath) {
    return this.datasetManager.exportForDomain(domain, outputPath, this.masterIndexer);
  }
}

export default PatternIndexManager;
