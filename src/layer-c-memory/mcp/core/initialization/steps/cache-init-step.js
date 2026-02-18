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

    server.cache = await getCacheManager(server.projectPath);

    // Preload critical data
    const { getProjectMetadata } = await import('#layer-c/query/apis/project-api.js');
    const { getAllConnections } = await import('#layer-c/query/apis/connections-api.js');
    const { getRiskAssessment } = await import('#layer-c/query/apis/risk-api.js');

    server.metadata = await getProjectMetadata(server.projectPath);
    server.cache.set('metadata', server.metadata);
    logger.info('  ✅ Metadata cached');

    const connections = await getAllConnections(server.projectPath);
    server.cache.set('connections', connections);
    logger.info(`  ✅ Connections cached (${connections.total} total)`);

    const assessment = await getRiskAssessment(server.projectPath);
    server.cache.set('assessment', assessment);
    const totalIssues = this.countIssues(assessment);
    logger.info(`  ✅ Risk assessment cached (${totalIssues} issues)`);

    const elapsed = (performance.now() - startTime).toFixed(2);
    logger.info(`\n  Cache load time: ${elapsed}ms`);

    return true;
  }

  countIssues(assessment) {
    if (!assessment?.report?.summary) return 0;
    const s = assessment.report.summary;
    return (s.criticalCount || 0) + (s.highCount || 0) + 
           (s.mediumCount || 0) + (s.lowCount || 0);
  }

  async rollback(server, error) {
    if (server.cache) {
      await server.cache.clear();
      server.cache = null;
    }
  }
}

export default CacheInitStep;
