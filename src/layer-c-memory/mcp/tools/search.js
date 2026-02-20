/**
 * Tool: search_files
 * Search for files in the project by pattern
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:search');



export async function search_files(args, context) {
  const { pattern } = args;
  const { projectPath, server } = context;
  
  logger.info(`[Tool] search_files("${pattern}")`);

  try {
    const metadata = await getProjectMetadata(projectPath);
    const fileIndex = metadata?.fileIndex || metadata?.files || {};
    const allFiles = Object.keys(fileIndex);
    const lowerPattern = pattern.toLowerCase();

    // Buscar por path de archivo
    const pathMatches = allFiles.filter(f => f.toLowerCase().includes(lowerPattern));

    // Buscar por símbolos exportados/definidos en cada archivo
    const symbolMatches = [];
    for (const [filePath, fileInfo] of Object.entries(fileIndex)) {
      if (pathMatches.includes(filePath)) continue;
      const exports = Array.isArray(fileInfo.exports) 
        ? fileInfo.exports.map(e => e.name || e).join(' ') 
        : '';
      const defs = Array.isArray(fileInfo.definitions) 
        ? fileInfo.definitions.map(d => d.name || d).join(' ') 
        : '';
      if ((exports + ' ' + defs).toLowerCase().includes(lowerPattern)) {
        symbolMatches.push(filePath);
      }
    }

    const allMatches = [...pathMatches, ...symbolMatches];

    return {
      pattern,
      found: allMatches.length,
      files: allMatches.slice(0, 20),
      byType: {
        pathMatches: pathMatches.length,
        symbolMatches: symbolMatches.length
      },
      totalIndexed: allFiles.length
    };
  } catch (error) {
    return {
      pattern,
      found: 0,
      files: [],
      error: error.message,
      note: 'Server may still be initializing'
    };
  }
}
