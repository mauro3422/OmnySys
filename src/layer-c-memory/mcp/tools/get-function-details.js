/**
 * MCP Tool: get_function_details
 * Obtiene detalles atómicos de una función específica
 */

import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';

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
      purpose: atom.purpose ? {
        type: atom.purpose,
        reason: atom.purposeReason,
        confidence: atom.purposeConfidence,
        isDeadCode: atom.isDeadCode
      } : null,
      callerPattern: atom.callerPattern || null,
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
      },
      dna: atom.dna ? {
        structuralHash: atom.dna.structuralHash,
        signature: atom.dna.signature,
        fingerprint: atom.dna.fingerprint
      } : null,
      performance: atom.performance ? {
        bigO: atom.performance.bigO,
        nestedLoops: atom.performance.nestedLoops,
        heavyCalls: atom.performance.heavyCalls
      } : null,
      errorFlow: atom.errorFlow ? {
        catches: atom.errorFlow.catches || [],
        throws: atom.errorFlow.throws || [],
        propagation: atom.errorFlow.propagation
      } : null,
      temporal: atom.temporal ? {
        asyncPatterns: atom.temporal.patterns?.asyncPatterns,
        timers: atom.temporal.patterns?.timers || [],
        events: atom.temporal.patterns?.events || []
      } : null,
      typeContracts: atom.typeContracts ? {
        params: atom.typeContracts.params || [],
        returns: atom.typeContracts.returns,
        confidence: atom.typeContracts.confidence
      } : null,
      dataFlow: atom.dataFlow ? {
        inputs: atom.dataFlow.inputs?.length || 0,
        outputs: atom.dataFlow.outputs?.length || 0,
        transformations: atom.dataFlow.transformations?.length || 0
      } : null
    };
  } catch (error) {
    return { error: error.message };
  }
}
