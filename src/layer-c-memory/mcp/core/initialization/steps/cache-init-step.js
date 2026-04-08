/**
 * @fileoverview cache-init-step.js
 *
 * Step 2: Initialize Cache (AFTER Layer A, BEFORE LLM)
 *
 * Must run AFTER Layer A creates the .omnysysdata/ files.
 * Loads cache data before LLM and Orchestrator start.
 *
 * @module mcp/core/initialization/steps/cache-init-step
 */

import { InitializationStep } from './base-step.js';
import { getCacheManager } from '#core/cache/singleton.js';
import { initializeEmptyCache } from '#core/unified-server/initialization/cache-manager.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:cache:init:step');

/**
 * Step 2: Cache Initialization
 * Loads data after Layer A analysis, before LLM and Orchestrator.
 */
export class CacheInitStep extends InitializationStep {
  constructor() {
    super('cache-init');
  }

  async execute(server) {
    logger.info('Initialize Cache');

    const startTime = performance.now();

    try {
      server.cache = await getCacheManager(server.projectPath);
      try {
        const preload = await this.loadCriticalData(server.projectPath);

        server.metadata = preload.metadata;
        server.cache.set('metadata', preload.metadata);
        logger.info('  Metadata cached');

        server.cache.set('connections', preload.connections);
        logger.info(`  Connections cached (${preload.connections.total} total)`);

        server.cache.set('assessment', preload.assessment);
        const totalIssues = this.countIssues(preload.assessment);
        logger.info(`  Risk assessment cached (${totalIssues} issues)`);

        const elapsed = (performance.now() - startTime).toFixed(2);
        logger.info(`\n  Cache load time: ${elapsed}ms`);

        return true;
      } catch (preloadError) {
        logger.warn(`  Cache preload failed, continuing with empty cache: ${preloadError.message}`);
        initializeEmptyCache(server.cache);
        server.metadata = server.cache.get?.('metadata') || null;
        const elapsed = (performance.now() - startTime).toFixed(2);
        logger.info(`\n  Cache load time: ${elapsed}ms (empty fallback)`);
        return true;
      }
    } catch (error) {
      logger.error(`Cache initialization failed: ${error.message}`);
      try {
        server.cache = {
          index: { entries: {}, metadata: { totalFiles: 0, totalDependencies: 0 } },
          ramCache: new Map(),
          set(key, value) {
            this[key] = value;
          },
          setRamCache(key, value) {
            this.ramCache.set(key, value);
          },
          get(key) {
            if (this.ramCache?.has?.(key)) {
              return this.ramCache.get(key);
            }
            return this[key];
          },
          purge() {
            this.index = { entries: {}, metadata: { totalFiles: 0, totalDependencies: 0 } };
            this.ramCache = new Map();
          },
          getCacheStats() {
            return { status: 'fallback', totalFiles: 0, totalDependencies: 0 };
          }
        };
        initializeEmptyCache(server.cache);
        server.metadata = server.cache.get('metadata');
        logger.warn('  Cache fallback created in memory; continuing startup.');
        return true;
      } catch (fallbackError) {
        await this.rollback(server, error);
        throw new Error(`CacheInitStep failed: ${error.message}; fallback failed: ${fallbackError.message}`);
      }
    }
  }

  async loadCriticalData(projectPath) {
    const { getProjectMetadata } = await import('#layer-c/query/apis/project-api.js');
    const { getAllConnections } = await import('#layer-c/query/apis/connections-api.js');
    const { getRiskAssessment } = await import('#layer-c/query/apis/risk-api.js');

    const metadata = await getProjectMetadata(projectPath);
    const connections = await getAllConnections(projectPath);
    const assessment = await getRiskAssessment(projectPath);

    return { metadata, connections, assessment };
  }

  countIssues(assessment) {
    if (!assessment?.report?.summary) return 0;
    const s = assessment.report.summary;
    return (s.criticalCount || 0) + (s.highCount || 0) +
           (s.mediumCount || 0) + (s.lowCount || 0);
  }

  async rollback(server, error) {
    if (server.cache) {
      await server.cache.purge();
      server.cache = null;
    }
    server.metadata = null;
  }
}

export default CacheInitStep;
