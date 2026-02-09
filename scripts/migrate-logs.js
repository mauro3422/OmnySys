#!/usr/bin/env node

/**
 * @fileoverview Log Migration Script
 * 
 * Automatically migrates console.log to logger system
 * Usage: node scripts/migrate-logs.js <file-or-directory>
 * 
 * @module scripts/migrate-logs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger('OmnySys:migrate-logs');

const loggerPatterns = [
  // Match console.log/warn/error with optional arguments
  /console\.(log|warn|error|debug)\s*\(/g
];

/**
 * Migrate a single file
 */
async function migrateFile(filePath) {
  logger.info(`Processing: ${filePath}`);
  
  let content = await fs.readFile(filePath, 'utf-8');
  const originalContent = content;
  
  // Check if already has logger import
  const hasLoggerImport = content.includes('createLogger') || 
                          content.includes('from\'..\/..\/utils\/logger\'') ||
                          content.includes('from\'..\/utils\/logger\'');
  
  // Count console usages
  const consoleMatches = content.match(/console\.(log|warn|error|debug)\s*\(/g);
  if (!consoleMatches) {
    logger.info(`  No console statements found, skipping`);
    return { migrated: false, count: 0 };
  }
  
  // Determine relative path to utils/logger.js
  const relativePath = path.relative(path.dirname(filePath), path.join(process.cwd(), 'src/utils/logger.js'));
  const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
  
  // Add logger import if needed
  if (!hasLoggerImport) {
    // Find best place to insert import
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('const ')) {
        lastImportIndex = i;
      }
    }
    
    // Insert after imports or at top
    const importLine = `import { createLogger } from '${importPath.replace(/\\/g, '/')}';
`;
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    
    content = lines.join('\n');
  }
  
  // Add logger initialization if not present
  const hasLoggerInit = content.includes('const logger = createLogger(');
  
  if (!hasLoggerInit) {
    // Add after imports
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        insertIndex = i + 1;
      }
    }
    
    // Determine module name from file path
    const moduleName = path.basename(filePath, '.js')
      .replace(/-/g, ':')
      .replace(/_/g, ':');
    
    const initLine = `
const logger = createLogger('OmnySys:${moduleName}');
`;
    
    lines.splice(insertIndex, 0, initLine);
    content = lines.join('\n');
  }
  
  // Replace console statements with logger
  content = content.replace(
    /console\.log\s*\(([^)]+)\)/g,
    'logger.info($1)'
  );
  
  content = content.replace(
    /console\.warn\s*\(([^)]+)\)/g,
    'logger.warn($1)'
  );
  
  content = content.replace(
    /console\.error\s*\(([^)]+)\)/g,
    'logger.error($1)'
  );
  
  content = content.replace(
    /console\.debug\s*\(([^)]+)\)/g,
    'logger.debug($1)'
  );
  
  // Write back if changed
  if (content !== originalContent) {
    await fs.writeFile(filePath, content, 'utf-8');
    logger.info(`  ✅ Migrated ${consoleMatches.length} statements`);
    return { migrated: true, count: consoleMatches.length };
  }
  
  return { migrated: false, count: 0 };
}

/**
 * Process directory recursively
 */
async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let totalMigrated = 0;
  let totalFiles = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      const stats = await processDirectory(fullPath);
      totalMigrated += stats.migrated;
      totalFiles += stats.files;
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      try {
        const result = await migrateFile(fullPath);
        if (result.count > 0) totalFiles++;
        if (result.migrated) totalMigrated++;
      } catch (error) {
        logger.error(`  ❌ Error: ${error.message}`);
      }
    }
  }
  
  return { migrated: totalMigrated, files: totalFiles };
}

/**
 * Main
 */
async function main() {
  const target = process.argv[2];
  
  if (!target) {
    logger.info('Usage: node scripts/migrate-logs.js <file-or-directory>');
    logger.info('');
    logger.info('Examples:');
    logger.info('  node scripts/migrate-logs.js src/core/analysis-worker.js');
    logger.info('  node scripts/migrate-logs.js src/core/');
    process.exit(1);
  }
  
  const fullPath = path.resolve(target);
  
  try {
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      logger.info(`Processing directory: ${fullPath}`);
      const stats = await processDirectory(fullPath);
      logger.info('');
      logger.info('='.repeat(50));
      logger.info('Migration Complete');
      logger.info('='.repeat(50));
      logger.info(`Files processed: ${stats.files}`);
      logger.info(`Files migrated: ${stats.migrated}`);
    } else {
      const result = await migrateFile(fullPath);
      logger.info('');
      logger.info(result.migrated ? '✅ Migration successful' : 'ℹ️ Nothing to migrate');
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
