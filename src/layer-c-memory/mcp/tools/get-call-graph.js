/**
 * Tool: get_call_graph
 * Obtiene el grafo de llamadas de un símbolo específico
 * Muestra TODOS los lugares donde se usa una función/clase
 */

import { findCallSites } from './lib/ast-analyzer.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:get:call:graph');



export async function get_call_graph(args, context) {
  const { filePath, symbolName, includeContext = true } = args;
  const { projectPath } = context;
  
  logger.error(`[Tool] get_call_graph("${filePath}", "${symbolName}")`);
  
  if (!filePath || !symbolName) {
    return {
      error: 'Missing required parameters: filePath and symbolName',
      example: 'get_call_graph({ filePath: "src/utils/helper.js", symbolName: "formatDate" })'
    };
  }
  
  try {
    const result = await findCallSites(projectPath, filePath, symbolName);
    
    if (result.error) {
      return {
        error: result.error,
        filePath,
        symbolName,
        suggestion: 'Verify the symbol exists and is exported'
      };
    }
    
    // Calcular métricas adicionales
    const uniqueFiles = [...new Set(result.callSites.map(site => site.file))];
    
    // Agrupar por archivo
    const byFile = {};
    for (const site of result.callSites) {
      if (!byFile[site.file]) {
        byFile[site.file] = [];
      }
      byFile[site.file].push({
        line: site.line,
        column: site.column,
        code: site.code,
        type: site.type
      });
    }
    
    return {
      symbol: symbolName,
      definedIn: filePath,
      exportType: result.exportType,
      summary: {
        totalCallSites: result.totalCallSites,
        uniqueFiles: uniqueFiles.length,
        isWidelyUsed: result.totalCallSites > 10,
        isIsolated: result.totalCallSites === 0
      },
      callSites: includeContext ? result.callSites : result.callSites.map(s => ({
        file: s.file,
        line: s.line,
        type: s.type
      })),
      byFile,
      impact: {
        level: result.totalCallSites > 20 ? 'critical' : 
               result.totalCallSites > 10 ? 'high' :
               result.totalCallSites > 0 ? 'medium' : 'none',
        description: result.totalCallSites === 0 ? 
          'Symbol is not used anywhere (orphan)' :
          result.totalCallSites > 20 ?
          'Widely used - changes will affect many parts of the system' :
          'Moderate usage - changes have limited scope'
      }
    };
    
  } catch (error) {
    logger.error(`Error in get_call_graph: ${error.message}`);
    return {
      error: error.message,
      filePath,
      symbolName
    };
  }
}
