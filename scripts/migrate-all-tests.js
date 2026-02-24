"use strict";
/**
 * @fileoverview Migration Runner - Ejecuta el proceso de migración
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import { findTestFiles } from './file-discovery.js';
import { migrateFile, getMigrationLog } from './file-migrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigration() {
  console.log('🚀 Starting Meta-Factory Migration\n');
  
  const testDir = resolve(__dirname, '../../tests/unit/layer-a-analysis');
  const allFiles = findTestFiles(testDir);
  
  console.log(`📁 Found ${allFiles.length} test files\n`);
  
  const stats = {
    total: allFiles.length,
    migrated: 0,
    skipped: 0,
    errors: 0,
    byArea: {}
  };
  
  // Process in batches of 50
  const BATCH_SIZE = 50;
  const batches = Math.ceil(allFiles.length / BATCH_SIZE);
  
  for (let i = 0; i < batches; i++) {
    const batch = allFiles.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    console.log(`\n📦 Processing batch ${i + 1}/${batches} (${batch.length} files)...`);
    
    for (const file of batch) {
      const result = migrateFile(file);
      const relativePath = file.replace(testDir, '').replace(/\\/g, '/');
      const area = relativePath.split('/')[1] || 'root';
      
      stats.byArea[area] = (stats.byArea[area] || 0) + 1;
      
      if (result.status === 'migrated') {
        stats.migrated++;
        console.log(`  ✅ ${relativePath}`);
      } else if (result.status === 'skipped') {
        stats.skipped++;
        console.log(`  ⏭️  ${relativePath} (${result.reason})`);
      } else {
        stats.errors++;
        console.log(`  ❌ ${relativePath} - ${result.error}`);
      }
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files:     ${stats.total}`);
  console.log(`Migrated:        ${stats.migrated} (${((stats.migrated/stats.total)*100).toFixed(1)}%)`);
  console.log(`Skipped:         ${stats.skipped}`);
  console.log(`Errors:          ${stats.errors}`);
  console.log('\nBy area:');
  for (const [area, count] of Object.entries(stats.byArea)) {
    console.log(`  ${area}: ${count} files`);
  }
  console.log('='.repeat(60));
  
  // Write log
  const logContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    log: getMigrationLog()
  }, null, 2);
  writeFileSync('migration-log.json', logContent);
  
  console.log('\n✅ Migration complete!');
  console.log('📄 Log saved to: migration-log.json');
  console.log('💾 Original files backed up with .original extension');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}
