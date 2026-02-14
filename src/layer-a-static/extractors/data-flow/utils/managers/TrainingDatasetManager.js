/**
 * @fileoverview TrainingDatasetManager.js
 * 
 * Manages training datasets.
 * 
 * @module data-flow/utils/managers/TrainingDatasetManager
 */

import path from 'path';
import { JsonStorage } from '../utils/JsonStorage.js';

/**
 * Manages training datasets
 */
export class TrainingDatasetManager {
  constructor(basePath) {
    this.basePath = basePath;
    this.storage = new JsonStorage();
  }

  /**
   * Update training dataset
   */
  async update(patternHash, data) {
    const trainingPath = path.join(this.basePath, patternHash, 'training.json');
    const dataset = await this.storage.load(trainingPath, {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      pattern: data.pattern,
      samples: []
    });

    dataset.samples.push({
      atomId: data.atomId,
      input: {
        tokens: data.tokens,
        mlFeatures: data.mlFeatures
      },
      output: {
        flowType: data.tokens.flowType,
        hasSideEffects: data.mlFeatures.sideEffectCount > 0,
        complexity: data.mlFeatures.transformCount
      },
      graph: data.graph
    });

    dataset.updatedAt = new Date().toISOString();
    dataset.totalSamples = dataset.samples.length;

    await this.storage.save(trainingPath, dataset);
  }

  /**
   * Export dataset for a domain
   */
  async exportForDomain(domain, outputPath, masterIndexer) {
    const allPatterns = await masterIndexer.getAllPatterns();
    const relevantPatterns = allPatterns.filter(p => 
      p.tokenSummary?.domains?.includes(domain)
    );

    const dataset = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      domain,
      totalPatterns: relevantPatterns.length,
      samples: []
    };

    for (const pattern of relevantPatterns) {
      const trainingPath = path.join(this.basePath, pattern.hash, 'training.json');
      const trainingData = await this.storage.load(trainingPath, { samples: [] });
      dataset.samples.push(...trainingData.samples);
    }

    dataset.totalSamples = dataset.samples.length;
    await this.storage.save(outputPath, dataset);
    
    return dataset;
  }
}

export default TrainingDatasetManager;
