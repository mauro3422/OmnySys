#!/usr/bin/env node

/**
 * @fileoverview Complete Validation Script
 * 
 * Runs both structural integrity and ground truth validation.
 * This is the "gold standard" for ensuring OmnySys data is correct.
 * 
 * @module scripts/validate-all
 */

import { validateDataIntegrity } from '../src/shared/data-integrity-validator.js';
import { validateGroundTruth } from '../src/shared/ground-truth-validator.js';
import { createLogger } from '../src/shared/logger-system.js';
import path from 'path';
import fs from 'fs/promises';

const logger = createLogger('OmnySys:validator');

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const omnysysPath = path.join(projectPath, '.omnysysdata');

  logger.info('='.repeat(70));
  logger.info('OMNYSYS COMPLETE VALIDATION');
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

  let allValid = true;

  // Phase 1: Structural Integrity
  logger.info('🔍 PHASE 1: Structural Integrity Validation');
  logger.info('-'.repeat(70));
  
  const integrityResult = await validateDataIntegrity(omnysysPath);
  
  if (!integrityResult.valid) {
    allValid = false;
    logger.error(`❌ FAILED: ${integrityResult.errors.length} errors, ${integrityResult.warnings.length} warnings`);
  } else if (integrityResult.warnings.length > 0) {
    logger.warn(`⚠️  PASSED with ${integrityResult.warnings.length} warnings`);
  } else {
    logger.info('✅ PASSED');
  }

  logger.info(`   Atoms: ${integrityResult.stats.atomsChecked}`);
  logger.info(`   Molecules: ${integrityResult.stats.moleculesChecked}`);
  logger.info(`   References: ${integrityResult.stats.referencesChecked}`);
  logger.info('');

  // Phase 2: Ground Truth
  logger.info('🔍 PHASE 2: Ground Truth Validation');
  logger.info('-'.repeat(70));
  
  const groundTruthResult = await validateGroundTruth(projectPath, omnysysPath);
  
  if (!groundTruthResult.valid) {
    allValid = false;
    logger.error(`❌ FAILED: ${groundTruthResult.stats.errors} mismatches`);
    
    // Show first 5 mismatches
    groundTruthResult.mismatches.slice(0, 5).forEach((m, i) => {
      logger.error(`   ${i + 1}. [${m.type}] ${m.file}`);
      logger.error(`      Expected: ${JSON.stringify(m.expected)}`);
      logger.error(`      Actual: ${JSON.stringify(m.actual)}`);
    });
    
    if (groundTruthResult.mismatches.length > 5) {
      logger.error(`   ... and ${groundTruthResult.mismatches.length - 5} more`);
    }
  } else {
    logger.info('✅ PASSED');
  }

  logger.info(`   Atoms verified: ${groundTruthResult.stats.atomsVerified}`);
  logger.info(`   Calls verified: ${groundTruthResult.stats.callsVerified}`);
  logger.info('');

  // Final Summary
  logger.info('='.repeat(70));
  logger.info('FINAL RESULT');
  logger.info('='.repeat(70));
  
  if (allValid) {
    logger.info('✅ ALL VALIDATIONS PASSED');
    logger.info('   Data integrity confirmed');
    logger.info('   Ground truth verified');
    logger.info('   System is production-ready');
    process.exit(0);
  } else {
    logger.error('❌ VALIDATION FAILED');
    logger.error('   Please review errors above');
    logger.error('   Run: omny analyze --force to regenerate');
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
