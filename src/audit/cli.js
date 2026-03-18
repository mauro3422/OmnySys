#!/usr/bin/env node

/**
 * @fileoverview Audit CLI
 * 
 * CLI para ejecutar auditorías
 * 
 * @module audit/cli
 */

import { runAudit } from './index.js';
import { createCliOrchestrator } from '../shared/cli/base-orchestrator.js';

const projectPath = process.argv[2] || process.cwd();

import { fileURLToPath } from 'url';

const main = createCliOrchestrator({
  name: 'audit',
  logger: console,
  run: async ({ logger }) => {
    logger.info('🔍 Auditing OmnySys context data...');
    
    const results = await runAudit(projectPath);
    
    logger.info('📊 Summary:');
    logger.info(`  Total files: ${results.summary.total}`);
    logger.info(`  Complete: ${results.summary.complete}`);
    logger.info(`  Incomplete: ${results.summary.incomplete}`);
    logger.info(`  Average score: ${results.summary.averageScore}%`);
    logger.info(`  Overall completeness: ${results.summary.completeness}%`);

    if (results.summary.incomplete > 0) {
      throw new Error('Some files have incomplete context');
    } else {
      logger.info('✅ All files have complete context');
    }
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
