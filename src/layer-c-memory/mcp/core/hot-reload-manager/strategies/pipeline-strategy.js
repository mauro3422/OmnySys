/**
 * @fileoverview Pipeline Strategy
 * 
 * Handles hot-reload of pipeline modules (analyzer, indexer, etc.).
 * Invalidates caches and requires re-analysis.
 * 
 * @module hot-reload-manager/strategies/pipeline-strategy
 */

import { BaseStrategy } from './base-strategy.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload:strategy:pipeline');

/**
 * Strategy for reloading pipeline modules
 * 
 * @class PipelineStrategy
 * @extends BaseStrategy
 */
export class PipelineStrategy extends BaseStrategy {
  /**
   * Reloads a pipeline module
   * 
   * @param {string} filename - Pipeline file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    logger.info(`Reloading pipeline module: ${filename}`);

    const modulePath = this._resolvePath(filename);

    try {
      // Resolve module ID
      const moduleId = await import.meta.resolve(modulePath).catch(() => modulePath);

      // Invalidate require cache
      this._invalidateCache(moduleId);

      // ESM: Use unique query string
      const uniqueImport = this._generateUniqueImport(modulePath, 'pipeline-reload');
      await import(uniqueImport);

      logger.info(`Pipeline module reloaded: ${filename}`);
      logger.warn('Analysis cache invalidated - next analysis will use new code');

      // Emit event for re-analysis
      this.server.emit('hot-reload:pipeline-updated', {
        file: filename,
        requiresReanalysis: true
      });

    } catch (error) {
      logger.error(`Failed to reload pipeline module ${filename}:`, error);
      throw error;
    }
  }
}

export default PipelineStrategy;
