/**
 * Tool: search_files
 * Search for files in the project by pattern
 */

import { fileExists } from '../../../layer-a-static/storage/query-service.js';
import fs from 'fs/promises';
import path from 'path';

// TODO: Implement proper file search
async function findFiles(projectPath, pattern) {
  // Simple implementation - list all JS files
  const files = [];
  const entries = await fs.readdir(projectPath, { recursive: true });
  for (const entry of entries) {
    if (entry.endsWith('.js') && !entry.includes('node_modules')) {
      files.push(entry);
    }
  }
  return files.filter(f => f.includes(pattern) || pattern === '**/*.js');
}

export async function search_files(args, context) {
  const { pattern } = args;
  const { projectPath } = context;
  
  console.error(`[Tool] search_files("${pattern}")`);

  const results = await findFiles(projectPath, pattern);
  
  return {
    pattern,
    found: results.length,
    files: results.slice(0, 20)
  };
}
