/**
 * MCP Tool: trace_data_journey
 *
 * Traces the deterministic journey of a variable or parameter from a source
 * function through cross-file call chains, following actual argument→parameter
 * mappings rather than probabilistic PageRank weights.
 *
 * @module mcp/tools/trace-data-journey
 */

import { getAtomsInFile, enrichAtomsWithRelations, queryAtoms } from '#layer-c/storage/index.js';
import { CrossFileResolver } from '#layer-a/pipeline/molecular-chains/cross-file/CrossFileResolver.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:trace-journey');

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
        dfs(edge.calleeId, paramName, depth + 1, step.path);
      }
    }
  }

  dfs(startAtomId, variableName, 1, [startAtomId]);
  return steps;
}

async function loadExternalAtoms(atoms, enrichedAtoms, projectPath) {
  const externalIds = new Set();
  
  for (const atom of enrichedAtoms) {
    for (const callerId of atom.callers || []) {
      if (!atoms.find(a => a.id === callerId)) externalIds.add(callerId);
    }
    for (const calleeId of atom.callees || []) {
      if (!atoms.find(a => a.id === calleeId)) externalIds.add(calleeId);
    }
  }
  
  if (externalIds.size === 0) return enrichedAtoms;
  
  const externalAtoms = await queryAtoms(projectPath, { ids: Array.from(externalIds) });
  if (!externalAtoms?.length) return enrichedAtoms;
  
  const enrichedExternal = await enrichAtomsWithRelations(externalAtoms, {
    scope: 'ids',
    ids: externalAtoms.map(a => a.id),
    withStats: true,
    withCallers: true,
    withCallees: true
  }, projectPath);
  
  return [...enrichedAtoms, ...enrichedExternal];
}

function findSourceAtom(enrichedAtoms, filePath, symbolName) {
  const normalizedFile = filePath.replace(/\\/g, '/').replace(/^.*?src\//, 'src/');
  const fileName = filePath.split('/').pop() || '';
  
  return enrichedAtoms.find(a =>
    a.name === symbolName &&
    (a.filePath === filePath ||
     a.filePath?.endsWith(normalizedFile) ||
     a.filePath?.includes(fileName))
  );
}

function checkVariableExists(sourceAtom, variableName) {
  const inInputs = (sourceAtom.dataFlow?.inputs || []).some(i => i.name === variableName);
  const inParams = (sourceAtom.typeContracts?.params || []).some(p => p.name === variableName);
  const inCalls = (sourceAtom.calls || []).some(c => (c.args || []).some(a => a.variable === variableName));
  
  return inInputs || inParams || inCalls;
}

function buildJourneySummary(steps) {
  const uniqueFiles = new Set(steps.map(s => s.calleeFile));
  const uniqueFunctions = new Set(steps.map(s => s.calleeId));
  
  const avgConfidence = steps.length > 0
    ? Math.round((steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length) * 100) / 100
    : 0;
  
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
  
  return {
    uniqueFiles,
    uniqueFunctions,
    avgConfidence,
    byDepth,
    maxDepth: steps.length > 0 ? Math.max(...steps.map(s => s.depth)) : 0
  };
}

export async function trace_data_journey(args, context) {
  const { filePath, symbolName, variableName, maxDepth = 5 } = args;
  const { projectPath } = context;

  if (!filePath || !symbolName || !variableName) {
    return {
      error: 'Required: filePath, symbolName, variableName',
      usage: 'trace_data_journey({ filePath: "src/...", symbolName: "myFn", variableName: "userId", maxDepth: 5 })'
    };
  }

  logger.debug(`Tracing journey of "${variableName}" from ${symbolName} in ${filePath}`);

  const atoms = await getAtomsInFile(projectPath, filePath);
  
  if (!atoms?.length) {
    return { error: `No atoms found in file: ${filePath}`, hint: 'Use get_molecule_summary.' };
  }
  
  let enrichedAtoms = await enrichAtomsWithRelations(atoms, {
    scope: 'ids',
    ids: atoms.map(a => a.id),
    withStats: true,
    withCallers: true,
    withCallees: true
  }, projectPath);
  
  enrichedAtoms = await loadExternalAtoms(atoms, enrichedAtoms, projectPath);

  const sourceAtom = findSourceAtom(enrichedAtoms, filePath, symbolName);

  if (!sourceAtom) {
    return { error: `Atom not found: ${symbolName} in ${filePath}`, hint: 'Check filePath and symbolName.' };
  }

  const varInSource = checkVariableExists(sourceAtom, variableName);

  const resolver = new CrossFileResolver(enrichedAtoms);
  const edgeMap = resolver.buildEdgeMap();
  const byId = new Map(enrichedAtoms.map(a => [a.id, a]));

  const steps = traceJourney(sourceAtom.id, variableName, edgeMap, byId, maxDepth);
  const { uniqueFiles, uniqueFunctions, avgConfidence, byDepth, maxDepth: maxDepthReached } = buildJourneySummary(steps);

  let explanation = null;
  if (steps.length === 0) {
    explanation = varInSource
      ? `Variable "${variableName}" is used locally but not passed across files.`
      : `Variable "${variableName}" not found in source function's parameters or data flow.`;
  }

  return {
    source: { id: sourceAtom.id, name: sourceAtom.name, filePath: sourceAtom.filePath, variable: variableName, foundInSource: varInSource },
    summary: { totalSteps: steps.length, maxDepthReached, uniqueFiles: uniqueFiles.size, uniqueFunctions: uniqueFunctions.size, avgConfidence, crossesFileBoundaries: uniqueFiles.size > 0 },
    journey: byDepth,
    rawSteps: steps.slice(0, 50),
    ...(explanation && { explanation })
  };
}

export default { trace_data_journey };
