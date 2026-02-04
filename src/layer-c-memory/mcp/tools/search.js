/**
 * Tool: search_files
 * Search for files in the project by pattern
 */

import { findFiles } from '../../../layer-a-static/storage/query-service.js';

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
