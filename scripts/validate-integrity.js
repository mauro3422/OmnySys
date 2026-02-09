#!/usr/bin/env node

/**
 * @fileoverview Data Integrity Validation Script
 * 
 * Validates consistency of OmnySys data and generates report.
 * Usage: node scripts/validate-integrity.js [project-path]
 * 
 * @module scripts/validate-integrity
 */

import { validateDataIntegrity, benchmarkValidation } from '../src/shared/data-integrity-validator.js';
import { createLogger } from '../src/utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

const logger = createLogger('validate-integrity');

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const omnysysPath = path.join(projectPath, '.omnysysdata');

  logger.info('='.repeat(70));
  logger.info('OMNYSYS DATA INTEGRITY VALIDATION');
  logger.info('='.repeat(70));
  logger.info(`Project: ${projectPath}`);
  logger.info(`Data: ${omnysysPath}`);
  logger.info('');

  // Check if data exists
  try {
    await fs.access(omnysysPath);
  } catch {
    logger.error('❌ .omnysysdata/ directory not found');
    logger.info('   Run analysis first: omny analyze');
    process.exit(1);
  }

  // Run validation
  logger.info('🔍 Running validation...\n');
  const result = await benchmarkValidation(omnysysPath);

  // Generate report
  logger.info('\n' + '='.repeat(70));
  logger.info('VALIDATION REPORT');
  logger.info('='.repeat(70));

  logger.info(`\n📊 Performance:`);
  logger.info(`   Duration: ${result.duration}ms`);
  logger.info(`   Atoms: ${result.stats.atomsChecked} (${result.performance.atomsPerMs.toFixed(2)}/ms)`);
  logger.info(`   Molecules: ${result.stats.moleculesChecked} (${result.performance.moleculesPerMs.toFixed(2)}/ms)`);
  logger.info(`   References: ${result.stats.referencesChecked}`);

  logger.info(`\n📋 Results:`);
  logger.info(`   Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
  logger.info(`   Errors: ${result.errors}`);
  logger.info(`   Warnings: ${result.warnings}`);

  // Exit code
  if (!result.valid) {
    logger.info('\n❌ Validation failed with errors');
    process.exit(1);
  } else if (result.warnings > 0) {
    logger.info('\n⚠️  Validation passed with warnings');
    process.exit(0);
  } else {
    logger.info('\n✅ Validation passed - Data integrity confirmed');
    process.exit(0);
  }
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
