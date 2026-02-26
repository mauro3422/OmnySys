/**
 * @fileoverview scanner.js - Scanner for audit-data-integrity
 */
import fs from 'fs/promises';
import path from 'path';
import { scanJsonFiles } from '../utils/script-utils-v2.js';

export async function readAllStorageFiles(rootPath) {
  const jsonFiles = await scanJsonFiles(rootPath, '.omnysysdata/files');
  const files = new Map();
  
  for (const fullPath of jsonFiles) {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      const filePath = data.path || data.filePath;
      if (filePath) {
        files.set(filePath, {
          fullPath,
          data,
          size: content.length
        });
      }
    } catch (e) {
      console.error(`Error reading ${fullPath}: ${e.message}`);
    }
  }
  
  return files;
}

export async function analyzeSourceFile(rootPath, filePath) {
  const fullPath = path.join(rootPath, filePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    
    return {
      exists: true,
      lines: content.split('\n').length,
      functionCount: (content.match(/function\s+\w+|=>\s*{|async\s+\w+\s*\(/g) || []).length,
      classCount: (content.match(/class\s+\w+/g) || []).length,
      exportCount: (content.match(/export\s+(default\s+)?|export\s*{|\bexport\s+function|\bexport\s+class|\bexport\s+const/g) || []).length,
      importCount: (content.match(/import\s+.*from|require\s*\(/g) || []).length,
      size: content.length
    };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}
