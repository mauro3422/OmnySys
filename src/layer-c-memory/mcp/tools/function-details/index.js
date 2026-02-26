/**
 * @fileoverview MCP Tool: get_function_details
 * Obtiene detalles completos de una función/átomo con TODA la metadata disponible
 * 
 * PATRÓN: Usa enrichAtomsWithRelations para datos graph.* deterministas
 * 
 * @module mcp/tools/function-details
 */

import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import {
  summarizeCalls,
  buildPerformanceSection,
  buildAsyncAnalysis,
  buildErrorFlowSection,
  buildDataFlowSection,
  buildTypeContractsSection,
  buildDnaSection
} from './builders/index.js';

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

    // PATRÓN: Enriquecer átomo con graph.*
    const enrichedAtoms = await enrichAtomsWithRelations([atom], {
      withStats: true,
      withCallers: true,
      withCallees: false
    }, projectPath);

    const atomWithGraph = enrichedAtoms[0] || atom;

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
        type: typeof atom.purpose === 'object' ? atom.purpose?.type : atom.purpose,
        reason: atom.purpose?.reason || atom.purposeReason,
        confidence: atom.purpose?.confidence || atom.purposeConfidence,
        isDeadCode: atom.purpose?.isDeadCode || atom.isDeadCode
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

      // Tree-sitter high-precision metadata (v0.9.62)
      sharedStateAccess: atom.sharedStateAccess || [],
      eventEmitters: atom.eventEmitters || [],
      eventListeners: atom.eventListeners || [],
      scopeType: atom.scopeType || null,

      // Dominio semántico detectado
      semanticDomain: atom.semanticDomain || null,

      // PATRÓN: Datos del grafo enriquecidos
      graph: atomWithGraph.graph || null,

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

export default { get_function_details };
