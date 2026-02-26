/**
 * @fileoverview loader.js
 * Disk and storage loading for audit-full-scan
 */
import fs from 'fs/promises';
import { scanJsonFiles } from '../utils/script-utils.js';

export async function loadStorageFilePaths(rootPath) {
  const jsonFiles = await scanJsonFiles(rootPath, '.omnysysdata/files');
  const filePaths = [];
  for (const file of jsonFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const data = JSON.parse(content);
      const filePath = data.path || data.filePath;
      if (filePath) filePaths.push(filePath);
    } catch {}
  }
  return filePaths;
}
