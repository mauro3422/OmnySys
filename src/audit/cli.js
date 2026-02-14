#!/usr/bin/env node

/**
 * @fileoverview Audit CLI
 * 
 * CLI para ejecutar auditorías
 * 
 * @module audit/cli
 */

import { runAudit } from './index.js';

const projectPath = process.argv[2] || process.cwd();

async function main() {
  console.log('🔍 Auditing OmnySys context data...\n');
  
  const results = await runAudit(projectPath);
  
  console.log('📊 Summary:');
  console.log(`  Total files: ${results.summary.total}`);
  console.log(`  Complete: ${results.summary.complete}`);
  console.log(`  Incomplete: ${results.summary.incomplete}`);
  console.log(`  Average score: ${results.summary.averageScore}%`);
  console.log(`  Overall completeness: ${results.summary.completeness}%\n`);

  if (results.summary.incomplete > 0) {
    console.log('⚠️  Some files have incomplete context');
    process.exit(1);
  } else {
    console.log('✅ All files have complete context');
    process.exit(0);
  }
}

main().catch(console.error);
