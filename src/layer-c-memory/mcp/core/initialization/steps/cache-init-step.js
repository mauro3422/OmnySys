/**
 * @fileoverview cache-init-step.js
 *
 * Step 4: Initialize Cache
 *
 * @module mcp/core/initialization/steps/cache-init-step
 */

import { InitializationStep } from './base-step.js';
import { UnifiedCacheManager } from '#core/unified-cache-manager.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:cache:init:step');



/**
 * Step 4: Cache Initialization
 */
export class CacheInitStep extends InitializationStep {
  constructor() {
    super('cache-init');
  }

  async execute(server) {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('STEP 4: Initialize Cache');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const startTime = performance.now();

    server.cache = new UnifiedCacheManager(server.projectPath, {
      enableChangeDetection: true,
      cascadeInvalidation: true
    });

    await server.cache.initialize();

    // Preload critical data
    const { getProjectMetadata, getAllConnections, getRiskAssessment } = 
      await import('#layer-a/query/index.js');

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
