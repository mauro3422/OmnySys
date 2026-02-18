/**
 * MCP Tool: get_function_details
 * Obtiene detalles atómicos de una función específica
 */

import { getAtomDetails } from '#layer-c/query/queries/file-query.js';

export async function get_function_details(args, context) {
  const { filePath, functionName } = args;
  const { projectPath, cache } = context;
  
  try {
    const atom = await getAtomDetails(projectPath, filePath, functionName, cache);
    
    if (!atom) {
      return {
        error: `Function '${functionName}' not found in ${filePath}`,
        suggestion: 'The function may not be analyzed yet or is an anonymous function'
      };
    }
    
    return {
      atom: {
        id: atom.id,
        name: atom.name,
        type: 'atom',
        line: atom.line,
        linesOfCode: atom.linesOfCode,
        complexity: atom.complexity,
        isExported: atom.isExported,
        isAsync: atom.isAsync
      },
      archetype: atom.archetype,
      sideEffects: {
        hasNetworkCalls: atom.hasNetworkCalls,
        hasDomManipulation: atom.hasDomManipulation,
        hasStorageAccess: atom.hasStorageAccess,
        hasLogging: atom.hasLogging,
        networkEndpoints: atom.networkEndpoints
      },
      callGraph: {
        calls: atom.calls?.length || 0,
        externalCalls: atom.externalCallCount,
        calledBy: atom.calledBy?.length || 0,
        callers: atom.calledBy || []
      },
      quality: {
        hasErrorHandling: atom.hasErrorHandling,
        hasNestedLoops: atom.hasNestedLoops,
        hasBlockingOps: atom.hasBlockingOps
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}
