/**
 * MCP Tool: get_function_details
 * Obtiene detalles completos de una función/átomo con TODA la metadata disponible
 */

import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';

export async function get_function_details(args, context) {
  const { filePath, functionName, includeCode = false, includeTransformations = false } = args;
  const { projectPath, cache } = context;
  
  try {
    const atom = await getAtomDetails(projectPath, filePath, functionName, cache);
    
    if (!atom) {
      return {
        error: `Function '${functionName}' not found in ${filePath}`,
        suggestion: 'The function may not be analyzed yet or is an anonymous function'
      };
    }

    const result = {
      atom: {
        id: atom.id,
        name: atom.name,
        type: atom.type || 'atom',
        line: atom.line,
        endLine: atom.endLine,
        linesOfCode: atom.linesOfCode,
        complexity: atom.complexity,
        isExported: atom.isExported,
        isAsync: atom.isAsync,
        functionType: atom.functionType,
        className: atom.className
      },
      
      archetype: atom.archetype || null,
      
      purpose: atom.purpose ? {
        type: atom.purpose,
        reason: atom.purposeReason,
        confidence: atom.purposeConfidence,
        isDeadCode: atom.isDeadCode
      } : null,
      
      callerPattern: atom.callerPattern || null,
      
      callGraph: {
        calls: atom.calls?.length || 0,
        callsList: summarizeCalls(atom.calls),
        externalCalls: atom.externalCallCount || 0,
        calledBy: atom.calledBy?.length || 0,
        callers: atom.calledBy || []
      },
      
      quality: {
        hasErrorHandling: atom.hasErrorHandling,
        hasNestedLoops: atom.hasNestedLoops,
        hasBlockingOps: atom.hasBlockingOps,
        hasLifecycleHooks: atom.hasLifecycleHooks,
        hasCleanupPatterns: atom.hasCleanupPatterns,
        hasSideEffects: atom.hasSideEffects
      },
      
      performance: buildPerformanceSection(atom),
      
      asyncAnalysis: buildAsyncAnalysis(atom),
      
      errorFlow: buildErrorFlowSection(atom),
      
      dataFlow: buildDataFlowSection(atom, includeTransformations),
      
      typeContracts: buildTypeContractsSection(atom),
      
      dna: buildDnaSection(atom),
      
      sideEffects: {
        hasNetworkCalls: atom.hasNetworkCalls,
        hasDomManipulation: atom.hasDomManipulation,
        hasStorageAccess: atom.hasStorageAccess,
        hasLogging: atom.hasLogging,
        networkEndpoints: atom.networkEndpoints || []
      },

      // Scores derivados de la metadata estática (sin LLM)
      derived: atom.derived ? {
        fragilityScore: atom.derived.fragilityScore,   // 0-1: prob. de romper si se modifica
        testabilityScore: atom.derived.testabilityScore, // 0-1: facilidad de testear
        couplingScore: atom.derived.couplingScore,       // n: conexiones totales
        changeRisk: atom.derived.changeRisk              // 0-1: impacto de un cambio
      } : null,

      // Dominio semántico detectado
      semanticDomain: atom.semanticDomain || null,

      meta: atom._meta || null
    };

    if (includeCode && atom.dataFlow?.inputs) {
      result.codeSnippet = {
        line: atom.line,
        endLine: atom.endLine
      };
    }
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

function summarizeCalls(calls) {
  if (!calls || calls.length === 0) return [];
  
  const grouped = {};
  for (const call of calls) {
    const key = call.name || call.callee || 'unknown';
    if (!grouped[key]) {
      grouped[key] = { name: key, count: 0, type: call.type, lines: [] };
    }
    grouped[key].count++;
    if (call.line) grouped[key].lines.push(call.line);
  }
  
  return Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function buildPerformanceSection(atom) {
  if (!atom.performance) return null;
  
  const perf = atom.performance;
  
  return {
    complexity: perf.complexity ? {
      cyclomatic: perf.complexity.cyclomatic || atom.complexity,
      cognitive: perf.complexity.cognitive,
      bigO: perf.complexity.bigO
    } : null,
    expensiveOps: perf.expensiveOps ? {
      nestedLoops: perf.expensiveOps.nestedLoops || 0,
      recursion: perf.expensiveOps.recursion || false,
      blockingOps: perf.expensiveOps.blockingOps || [],
      heavyCalls: perf.expensiveOps.heavyCalls || []
    } : null,
    resources: perf.resources || null,
    estimates: perf.estimates ? {
      executionTime: perf.estimates.executionTime,
      blocking: perf.estimates.blocking,
      async: perf.estimates.async,
      expensiveWithCache: perf.estimates.expensiveWithCache
    } : null,
    impactScore: perf.impactScore
  };
}

function buildAsyncAnalysis(atom) {
  if (!atom.temporal?.patterns) return null;
  
  const temporal = atom.temporal.patterns;
  const asyncFlow = temporal.asyncFlowAnalysis;
  
  return {
    patterns: {
      isAsync: temporal.asyncPatterns?.isAsync || atom.isAsync,
      hasAwait: temporal.asyncPatterns?.hasAwait,
      hasPromiseAll: temporal.asyncPatterns?.hasPromiseAll,
      hasPromiseRace: temporal.asyncPatterns?.hasPromiseRace,
      hasPromiseAllSettled: temporal.asyncPatterns?.hasPromiseAllSettled,
      hasNewPromise: temporal.asyncPatterns?.hasNewPromise,
      hasPromiseChain: temporal.asyncPatterns?.hasPromiseChain
    },
    sequentialOperations: temporal.asyncPatterns?.sequentialOperations || [],
    parallelOperations: temporal.asyncPatterns?.parallelOperations || [],
    flowAnalysis: asyncFlow ? {
      overallRisk: asyncFlow.overallRisk,
      summary: asyncFlow.summary,
      recommendations: asyncFlow.allRecommendations || [],
      concerns: asyncFlow.analyses?.flatMap(a => a.concerns || []) || []
    } : null,
    timers: temporal.timers || [],
    events: temporal.events || [],
    executionOrder: temporal.executionOrder || atom.temporal.executionOrder
  };
}

function buildErrorFlowSection(atom) {
  if (!atom.errorFlow) return null;
  
  const ef = atom.errorFlow;
  
  return {
    throws: ef.throws || [],
    catches: (ef.catches || []).map(c => ({
      type: c.type,
      variable: c.variable,
      rethrows: c.rethrows,
      logs: c.logs,
      returns: c.returns,
      transforms: c.transforms
    })),
    tryBlocks: (ef.tryBlocks || []).map(tb => ({
      hasCatch: tb.hasCatch,
      hasFinally: tb.hasFinally,
      lines: tb.lines,
      protectedCallsCount: tb.protectedCalls?.length || 0,
      protectedCallsSample: tb.protectedCalls?.slice(0, 10)
    })),
    unhandledCalls: ef.unhandledCalls || [],
    propagation: ef.propagation
  };
}

function buildDataFlowSection(atom, includeTransformations) {
  if (!atom.dataFlow) return null;
  
  const df = atom.dataFlow;
  
  const result = {
    inputs: (df.inputs || []).map(input => ({
      name: input.name,
      position: input.position,
      type: input.type,
      hasDefault: input.hasDefault,
      defaultValue: input.defaultValue,
      usageCount: input.usages?.length || 0
    })),
    outputs: (df.outputs || []).map(output => ({
      type: output.type,
      value: output.value,
      line: output.line,
      isSideEffect: output.type === 'side_effect'
    })),
    transformationCount: df.transformations?.length || 0,
    graph: df.graph?.meta || null,
    analysis: df.analysis || null
  };

  if (includeTransformations && df.transformations) {
    result.transformations = df.transformations.slice(0, 50).map(t => ({
      to: t.to,
      from: Array.isArray(t.from) ? t.from.slice(0, 3) : t.from,
      operation: t.operation,
      line: t.line,
      type: t.type
    }));
  }

  result.summary = {
    inputCount: result.inputs.length,
    outputCount: result.outputs.length,
    sideEffectsCount: result.outputs.filter(o => o.isSideEffect).length,
    returnCount: result.outputs.filter(o => o.type === 'return').length,
    throwCount: result.outputs.filter(o => o.type === 'throw').length
  };
  
  return result;
}

function buildTypeContractsSection(atom) {
  if (!atom.typeContracts) return null;
  
  const tc = atom.typeContracts;
  
  return {
    signature: tc.signature,
    params: tc.params || [],
    returns: tc.returns,
    throws: tc.throws || [],
    generics: tc.generics || [],
    confidence: tc.confidence
  };
}

function buildDnaSection(atom) {
  if (!atom.dna) return null;
  
  return {
    structuralHash: atom.dna.structuralHash,
    patternHash: atom.dna.patternHash,
    flowType: atom.dna.flowType,
    complexityScore: atom.dna.complexityScore,
    semanticFingerprint: atom.dna.semanticFingerprint,
    inputCount: atom.dna.inputCount,
    outputCount: atom.dna.outputCount,
    transformationCount: atom.dna.transformationCount,
    operationSequenceLength: atom.dna.operationSequence?.length || 0
  };
}
