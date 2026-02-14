/**
 * @fileoverview MasterIndexer.js
 * 
 * Manages master pattern index.
 * 
 * @module data-flow/utils/managers/MasterIndexer
 */

import { JsonStorage } from '../utils/JsonStorage.js';

/**
 * Manages master pattern index
 */
export class MasterIndexer {
  constructor(indexPath) {
    this.indexPath = indexPath;
    this.storage = new JsonStorage();
  }

  /**
   * Update master index entry
   */
  async update(patternHash, metadata) {
    let index = await this.load();

    if (!index.patterns[patternHash]) {
      index.patterns[patternHash] = {
        hash: patternHash,
        pattern: metadata.pattern,
        flowType: metadata.flowType,
        firstSeen: new Date().toISOString(),
        atomCount: 0,
        filePath: path.dirname(this.indexPath) + '/' + patternHash
      };
    }

    const entry = index.patterns[patternHash];
    entry.atomCount++;
    entry.lastUpdated = new Date().toISOString();
    entry.tokenSummary = metadata.tokenSummary;
    entry.featureSummary = metadata.featureSummary;

    await this.storage.save(this.indexPath, index);
  }

  /**
   * Load master index
   */
  async load() {
    return this.storage.load(this.indexPath, {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      patterns: {}
    });
  }

  /**
   * Get all patterns
   */
  async getAllPatterns() {
    const index = await this.load();
    return Object.values(index.patterns);
  }
}

export default MasterIndexer;
