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
import {
  applyCriticalCacheData,
  countAssessmentIssues,
  createHydratedEmptyCache
} from './cache-init-helpers.js';
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
    } catch (error) {
      logger.error(`Cache initialization failed: ${error.message}`);
      server.cache = createHydratedEmptyCache();
      server.metadata = server.cache.get('metadata') || null;
      logger.warn('  Cache fallback created in memory; continuing startup.');
      logger.info(`\n  Cache load time: ${(performance.now() - startTime).toFixed(2)}ms (empty fallback)`);
      return true;
    }

    try {
      const preload = await this.loadCriticalData(server.projectPath);

      applyCriticalCacheData(server, preload);
      logger.info('  Metadata cached');
      logger.info(`  Connections cached (${preload.connections.total} total)`);

      const totalIssues = countAssessmentIssues(preload.assessment);
      logger.info(`  Risk assessment cached (${totalIssues} issues)`);

      const elapsed = (performance.now() - startTime).toFixed(2);
      logger.info(`\n  Cache load time: ${elapsed}ms`);

      return true;
    } catch (preloadError) {
      logger.warn(`  Cache preload failed, continuing with empty cache: ${preloadError.message}`);
      server.cache = createHydratedEmptyCache();
      server.metadata = server.cache.get('metadata') || null;
      const elapsed = (performance.now() - startTime).toFixed(2);
      logger.info(`\n  Cache load time: ${elapsed}ms (empty fallback)`);
      return true;
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

  async rollback(server, error) {
    if (server.cache) {
      await server.cache.purge();
      server.cache = null;
    }
    server.metadata = null;
  }
}

export default CacheInitStep;
