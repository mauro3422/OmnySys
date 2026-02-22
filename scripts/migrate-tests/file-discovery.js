/**
 * @fileoverview File Discovery - Encuentra archivos de test
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export function findTestFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules')) {
        findTestFiles(fullPath, files);
      } else if (item.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Directory doesn't exist or no access
  }
  return files;
}

export function isMigrated(content) {
  return content.includes('createAnalysisTestSuite') || 
         content.includes('createUtilityTestSuite') ||
         content.includes('createDetectorTestSuite');
}
