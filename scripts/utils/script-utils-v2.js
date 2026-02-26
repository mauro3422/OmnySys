/**
 * @fileoverview script-utils-v2.js - Enhanced utilities
 */
import fs from 'fs/promises';
import path from 'path';

export async function scanJsonFiles(rootPath, subDir) {
  const targetDir = path.join(rootPath, subDir);
  const results = [];
  
  try {
    const items = await fs.readdir(targetDir);
    for (const item of items) {
      if (item.endsWith('.json')) {
        results.push(path.join(targetDir, item));
      }
    }
  } catch (e) {
    // Ignore missing dirs
  }
  return results;
}
