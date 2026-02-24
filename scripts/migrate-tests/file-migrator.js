"use strict";
/**
 * @fileoverview File Migrator - Migra archivos individuales
 */

import { readFileSync, writeFileSync } from 'fs';
import { isMigrated } from './file-discovery.js';
import { generateMetaTest } from './meta-test-generator.js';

const MIGRATION_LOG = [];

export function migrateFile(testPath) {
  try {
    const content = readFileSync(testPath, 'utf-8');
    
    // Skip already migrated
    if (isMigrated(content)) {
      return { status: 'skipped', reason: 'already_migrated' };
    }
    
    // Generate new content
    const newContent = generateMetaTest(testPath, content);
    
    if (!newContent) {
      return { status: 'skipped', reason: 'no_layer_a_imports' };
    }
    
    // Backup original
    writeFileSync(`${testPath}.original`, content);
    
    // Write new content
    writeFileSync(testPath, newContent);
    
    return { status: 'migrated' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

export function getMigrationLog() {
  return MIGRATION_LOG;
}
