/**
 * @fileoverview PatternDirectoryManager.js
 * 
 * Manages pattern directories.
 * 
 * @module data-flow/utils/managers/PatternDirectoryManager
 */

import fs from 'fs';
import path from 'path';
import { JsonStorage } from '../utils/JsonStorage.js';
import { StatisticsCalculator } from './DataSummarizers.js';

/**
 * Manages pattern directories
 */
export class PatternDirectoryManager {
  constructor(basePath) {
    this.basePath = basePath;
    this.storage = new JsonStorage();
  }

  /**
   * Update pattern directory
   */
  async update(patternHash, data) {
    const patternDir = path.join(this.basePath, patternHash);
    
    if (!fs.existsSync(patternDir)) {
      fs.mkdirSync(patternDir, { recursive: true });
    }

    await this.updateMetadata(patternDir, patternHash, data);
    await this.updateAtomsList(patternDir, data);
  }

  /**
   * Update metadata file
   */
  async updateMetadata(patternDir, patternHash, data) {
    const metadataPath = path.join(patternDir, 'metadata.json');
    const existing = await this.storage.load(metadataPath, {});

    const metadata = {
      ...existing,
      hash: patternHash,
      pattern: data.pattern,
      flowType: data.flowType,
      tokens: data.tokens,
      updatedAt: new Date().toISOString(),
      statistics: StatisticsCalculator.calculate(existing.statistics, data.mlFeatures)
    };

    await this.storage.save(metadataPath, metadata);
  }

  /**
   * Update atoms list
   */
  async updateAtomsList(patternDir, data) {
    const atomsPath = path.join(patternDir, 'atoms.json');
    const atoms = await this.storage.load(atomsPath, []);

    if (!atoms.find(a => a.id === data.atomId)) {
      atoms.push({
        id: data.atomId,
        addedAt: new Date().toISOString(),
        mlFeatures: data.mlFeatures
      });
    }

    await this.storage.save(atomsPath, atoms);
  }

  /**
   * Find atoms by pattern hash
   */
  async findAtoms(patternHash, limit = 10) {
    const atomsPath = path.join(this.basePath, patternHash, 'atoms.json');
    
    try {
      const atoms = await this.storage.load(atomsPath, []);
      return atoms.slice(0, limit).map(a => a.id);
    } catch {
      return [];
    }
  }
}

export default PatternDirectoryManager;
