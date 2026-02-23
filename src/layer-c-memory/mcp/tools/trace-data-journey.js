/**
 * MCP Tool: trace_data_journey
 *
 * Traces the deterministic journey of a variable or parameter from a source
 * function through cross-file call chains, following actual argument→parameter
 * mappings rather than probabilistic PageRank weights.
 *
 * USA el módulo estándar de enrichment para relaciones.
 *
 * @module mcp/tools/trace-data-journey
 */

import { getAllAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { CrossFileResolver } from '#layer-a/pipeline/molecular-chains/cross-file/CrossFileResolver.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:trace-journey');

/**
 * DFS traversal following actual argument flow for a given variable.
 *
 * @param {string} startAtomId
 * @param {string} variableName
 * @param {Map<string, CrossFileEdge[]>} edgeMap
 * @param {Map<string, Object>} byId
 * @param {number} maxDepth
 * @returns {Object[]} journey steps
 */
function traceJourney(startAtomId, variableName, edgeMap, byId, maxDepth) {
  const steps = [];
  const visited = new Set();

  function dfs(atomId, currentVar, depth, path) {
    if (depth > maxDepth || visited.has(atomId)) return;
    visited.add(atomId);

    const edges = edgeMap.get(atomId) || [];

    for (const edge of edges) {
      const { mapping } = edge;
      if (!mapping?.mappings) continue;

      // Find which parameter position receives currentVar
      const matchingMappings = mapping.mappings.filter(m =>
        m.argument?.variable === currentVar ||
        m.argument?.code === currentVar
      );

      if (matchingMappings.length === 0) continue;

      const calleeAtom = byId.get(edge.calleeId);
      if (!calleeAtom) continue;

      for (const m of matchingMappings) {
        const paramName = m.parameter?.name || `param${m.position}`;
        const step = {
          depth,
          callerId: edge.callerId,
          callerName: byId.get(edge.callerId)?.name || edge.callerId,
          callerFile: edge.callerFile,
          calleeId: edge.calleeId,
          calleeName: edge.calleeName,
          calleeFile: edge.calleeFile,
          callSite: edge.callSite,
          variableIn: currentVar,
          parameterIn: paramName,
          transform: m.transform || null,
          confidence: edge.confidence,
          path: [...path, edge.callerId]
        };

        steps.push(step);

        // Continue DFS using the parameter name in the callee context
        dfs(edge.calleeId, paramName, depth + 1, step.path);
      }
    }
  }

  dfs(startAtomId, variableName, 1, [startAtomId]);
  return steps;
}

export async function trace_data_journey(args, context) {
  const {
    filePath,
    symbolName,
    variableName,
    maxDepth = 5
  } = args;
  const { projectPath } = context;

  if (!filePath || !symbolName || !variableName) {
    return {
      error: 'Required: filePath, symbolName, variableName',
      usage: 'trace_data_journey({ filePath: "src/...", symbolName: "myFn", variableName: "userId", maxDepth: 5 })'
    };
  }

  logger.debug(`Tracing journey of "${variableName}" from ${symbolName} in ${filePath}`);

  const allAtoms = await getAllAtoms(projectPath);
  
  // ENRIQUECIMIENTO ESTÁNDAR: Agregar stats de relaciones
  const enrichedAtoms = await enrichAtomsWithRelations(allAtoms, {
    withStats: true,
    withCallers: true,
    withCallees: true
  }, projectPath);

  // Find source atom
  const normalizedFile = filePath.replace(/\\/g, '/').replace(/^.*?src\//, 'src/');
  const sourceAtom = enrichedAtoms.find(a =>
    a.name === symbolName &&
    (a.filePath === filePath ||
     a.filePath?.endsWith(normalizedFile) ||
     a.filePath?.includes(filePath.split('/').pop() || ''))
  );

  if (!sourceAtom) {
    return {
      error: `Atom not found: ${symbolName} in ${filePath}`,
      hint: 'Check filePath and symbolName. Use get_molecule_summary to list available atoms.'
    };
  }

  // Verify the variable exists in the source atom
  const varInSource = (sourceAtom.dataFlow?.inputs || []).some(i => i.name === variableName) ||
    (sourceAtom.typeContracts?.params || []).some(p => p.name === variableName) ||
    (sourceAtom.calls || []).some(c => (c.args || []).some(a => a.variable === variableName));

  // Build cross-file edge map (query-time, no storage needed)
  const resolver = new CrossFileResolver(enrichedAtoms);
  const edgeMap = resolver.buildEdgeMap();
  const byId = new Map(enrichedAtoms.map(a => [a.id, a]));

  // Trace the journey
  const steps = traceJourney(sourceAtom.id, variableName, edgeMap, byId, maxDepth);

  // Build summary
  const uniqueFiles = new Set(steps.map(s => s.calleeFile));
  const uniqueFunctions = new Set(steps.map(s => s.calleeId));
  const avgConfidence = steps.length > 0
    ? Math.round((steps.reduce((s, e) => s + e.confidence, 0) / steps.length) * 100) / 100
    : 0;

  // Group by depth for readable output
  const byDepth = {};
  for (const step of steps) {
    if (!byDepth[step.depth]) byDepth[step.depth] = [];
    byDepth[step.depth].push({
      from: `${step.callerName} (${step.callerFile}:${step.callSite})`,
      to: `${step.calleeName} (${step.calleeFile})`,
      as: step.parameterIn,
      transform: step.transform?.type || null,
      confidence: step.confidence
    });
  }

  // Build journey explanation for empty results
  let explanation = null;
  if (steps.length === 0) {
    if (!varInSource) {
      explanation = `Variable "${variableName}" was not found in the source function's parameters or data flow. It might be a local variable that doesn't cross function boundaries.`;
    } else {
      explanation = `Variable "${variableName}" is used locally in ${symbolName} but is not passed to any other functions across file boundaries. This is expected for local variables.`;
    }
  }

  return {
    source: {
      id: sourceAtom.id,
      name: sourceAtom.name,
      filePath: sourceAtom.filePath,
      variable: variableName,
      foundInSource: varInSource
    },
    summary: {
      totalSteps: steps.length,
      maxDepthReached: steps.length > 0 ? Math.max(...steps.map(s => s.depth)) : 0,
      uniqueFiles: uniqueFiles.size,
      uniqueFunctions: uniqueFunctions.size,
      avgConfidence,
      crossesFileBoundaries: uniqueFiles.size > 0
    },
    journey: byDepth,
    rawSteps: steps.slice(0, 50), // cap at 50 for safety
    ...(explanation && { explanation })
  };
}

export default { trace_data_journey };
