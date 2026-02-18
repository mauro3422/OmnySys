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
  
  logger.error(`[Tool] search_files("${pattern}")`);

  try {
    // Usar metadata indexada (más rápido que escanear disco)
    const metadata = await getProjectMetadata(projectPath);
    const fileIndex = metadata?.fileIndex || metadata?.files || {};
    
    // Filtrar archivos que coincidan con el patrón
    const allFiles = Object.keys(fileIndex);
    const results = allFiles.filter(filePath => {
      // Buscar en el path completo del archivo
      return filePath.toLowerCase().includes(pattern.toLowerCase());
    });

    return {
      pattern,
      found: results.length,
      files: results.slice(0, 20),
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
