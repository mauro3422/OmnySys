/**
 * @fileoverview loader.js
 * Loading functions for audit-data-flow
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function readIndex(rootPath) {
  const indexPath = path.join(rootPath, '.omnysysdata', 'index.json');
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getFilesFromStorage(rootPath) {
  const filesDir = path.join(rootPath, '.omnysysdata', 'files');
  const files = [];
  
  try {
    const entries = await fs.readdir(filesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const filePath = path.join(filesDir, entry.name);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          if (data.filePath) {
            files.push(data.filePath);
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* empty */ }
  
  return files;
}

export async function getAtomsFromStorage(rootPath, filePath) {
  const atomsDir = path.join(rootPath, '.omnysysdata', 'atoms');
  try {
    const fileHash = crypto.createHash('md5').update(filePath).digest('hex');
    const atomFile = path.join(atomsDir, `${fileHash}.json`);
    const content = await fs.readFile(atomFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
