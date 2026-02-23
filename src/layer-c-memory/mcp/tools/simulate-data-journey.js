/**
 * MCP Tool: simulate_data_journey
 *
 * Phase 5: Simulation Engine.
 *
 * Full virtual graph walk from an entry function, simulating how data flows
 * through the system. Aggregates:
 *   - Side effects encountered (db writes, network calls, storage, logging)
 *   - Security flags (unvalidated data reaching sinks)
 *   - Estimated execution complexity per step
 *   - Race condition hotspots along the path
 *
 * USA el módulo estándar de enrichment para relaciones.
 *
 * @module mcp/tools/simulate-data-journey
 */

import { getAtomsInFile, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { CrossFileResolver } from '#layer-a/pipeline/molecular-chains/cross-file/CrossFileResolver.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:simulate-journey');

/**
 * Risk classifier for atoms in the call path
 */
function classifyAtomRisk(atom) {
  const risks = [];

  if (atom.hasNetworkCalls && !atom.hasErrorHandling) {
    risks.push({ type: 'fragile-network', severity: 'high', detail: 'Network call without error handling' });
  }
  if (atom.hasStorageAccess && atom.isAsync && !atom.hasErrorHandling) {
    risks.push({ type: 'fragile-storage', severity: 'high', detail: 'Storage access without error handling' });
  }
  if (atom.complexity > 20) {
    risks.push({ type: 'high-complexity', severity: 'medium', detail: `Cyclomatic complexity: ${atom.complexity}` });
  }
  if (atom.hasNestedLoops) {
    risks.push({ type: 'nested-loops', severity: 'medium', detail: 'Contains nested loops — O(n²) or worse' });
  }
  if (atom.hasSideEffects && !atom.hasErrorHandling) {
    risks.push({ type: 'unguarded-side-effect', severity: 'medium', detail: 'Side effect without guard' });
  }

  // Security: data reaching a sink without apparent validation upstream
  const isSink = atom.hasNetworkCalls || atom.hasStorageAccess ||
    /^(save|insert|exec|query|send|email|render)/.test((atom.name || '').toLowerCase());
  if (isSink) {
    risks.push({ type: 'data-sink', severity: 'info', detail: 'Data reaches external sink here' });
  }

  return risks;
}

/**
 * Aggregate side effects along the path
 */
function aggregateSideEffects(atom) {
  const effects = [];
  if (atom.hasNetworkCalls) effects.push({ type: 'network', endpoints: atom.networkEndpoints || [] });
  if (atom.hasStorageAccess) effects.push({ type: 'storage' });
  if (atom.hasDomManipulation) effects.push({ type: 'dom' });
  if (atom.hasLogging) effects.push({ type: 'logging' });
  if (atom.hasSideEffects && !atom.hasNetworkCalls && !atom.hasStorageAccess) {
    effects.push({ type: 'other-side-effect' });
  }
  return effects;
}

/**
 * BFS/DFS simulation walk.
 * Visits all reachable atoms from startAtom, aggregating risk.
 */
function simulateWalk(startAtom, edgeMap, byId, maxDepth) {
  const steps = [];
  const visited = new Set();
  const queue = [{ atomId: startAtom.id, depth: 0, path: [] }];

  while (queue.length > 0) {
    const { atomId, depth, path } = queue.shift();

    if (depth > maxDepth || visited.has(atomId)) continue;
    visited.add(atomId);

    const atom = byId.get(atomId);
    if (!atom || atomId === startAtom.id) {
      // Still enqueue children for start atom
      const edges = edgeMap.get(atomId) || [];
      for (const edge of edges) {
        if (!visited.has(edge.calleeId)) {
          queue.push({ atomId: edge.calleeId, depth: depth + 1, path: [...path, atomId] });
        }
      }
      continue;
    }

    const risks = classifyAtomRisk(atom);
    const sideEffects = aggregateSideEffects(atom);
    const edges = edgeMap.get(atomId) || [];

    steps.push({
      depth,
      atomId: atom.id,
      name: atom.name,
      filePath: atom.filePath,
      line: atom.line,
      isAsync: atom.isAsync || false,
      complexity: atom.complexity || 0,
      sideEffects,
      risks,
      callsOut: edges.length,
      path: [...path, atomId],
    });

    for (const edge of edges) {
      if (!visited.has(edge.calleeId)) {
        queue.push({ atomId: edge.calleeId, depth: depth + 1, path: [...path, atomId] });
      }
    }
  }

  return steps;
}

export async function simulate_data_journey(args, context) {
  const {
    filePath,
    symbolName,
    maxDepth = 6,
  } = args;
  const { projectPath } = context;

  if (!filePath || !symbolName) {
    return {
      error: 'Required: filePath, symbolName',
      usage: 'simulate_data_journey({ filePath: "src/api/handler.js", symbolName: "handleRequest", maxDepth: 6 })',
    };
  }

  logger.debug(`Phase 5: Simulating journey from ${symbolName}`);

  // 🚀 OPTIMIZADO: Cargar átomos del archivo específico
  let atoms = await getAtomsInFile(projectPath, filePath);
  
  if (!atoms || atoms.length === 0) {
    return {
      error: `No atoms found in file: ${filePath}`,
      hint: 'Use get_molecule_summary to list atoms in this file.'
    };
  }
  
  // ENRIQUECIMIENTO: Cargar TODAS las relaciones (internas + externas)
  let enrichedAtoms = await enrichAtomsWithRelations(atoms, {
    scope: 'ids',
    ids: atoms.map(a => a.id),
    withStats: true,
    withCallers: true,
    withCallees: true
  }, projectPath);
  
  // 🚀 CARGAR ÁTOMOS EXTERNOS RELACIONADOS (callers/callees de otros archivos)
  const externalIds = new Set();
  for (const atom of enrichedAtoms) {
    if (atom.callers) {
      for (const callerId of atom.callers) {
        if (!atoms.find(a => a.id === callerId)) externalIds.add(callerId);
      }
    }
    if (atom.callees) {
      for (const calleeId of atom.callees) {
        if (!atoms.find(a => a.id === calleeId)) externalIds.add(calleeId);
      }
    }
  }
  
  // Si hay átomos externos, enriquecer el grafo cargándolos también
  if (externalIds.size > 0) {
    const { queryAtoms } = await import('#layer-c/storage/index.js');
    const externalAtoms = await queryAtoms(projectPath, { ids: Array.from(externalIds) });
    if (externalAtoms && externalAtoms.length > 0) {
      const enrichedExternal = await enrichAtomsWithRelations(externalAtoms, {
        scope: 'ids',
        ids: externalAtoms.map(a => a.id),
        withStats: true,
        withCallers: true,
        withCallees: true
      }, projectPath);
      enrichedAtoms = [...enrichedAtoms, ...enrichedExternal];
    }
  }

  // Find entry atom
  const normalizedFile = filePath.replace(/\\/g, '/').replace(/^.*?src\//, 'src/');
  const entryAtom = enrichedAtoms.find(a =>
    a.name === symbolName &&
    (a.filePath === filePath ||
     a.filePath?.endsWith(normalizedFile) ||
     a.filePath?.includes(filePath.split('/').pop() || ''))
  );

  if (!entryAtom) {
    return {
      error: `Atom not found: ${symbolName} in ${filePath}`,
      hint: 'Use get_molecule_summary to list atoms in this file.',
    };
  }

  // Build cross-file edge map
  const resolver = new CrossFileResolver(enrichedAtoms);
  const edgeMap = resolver.buildEdgeMap();
  const byId = new Map(enrichedAtoms.map(a => [a.id, a]));

  // Walk the graph
  const steps = simulateWalk(entryAtom, edgeMap, byId, maxDepth);

  // Aggregate summary
  const allRisks = steps.flatMap(s => s.risks);
  const allSideEffects = steps.flatMap(s => s.sideEffects);
  const uniqueFiles = new Set(steps.map(s => s.filePath));

  const riskCounts = { critical: 0, high: 0, medium: 0, info: 0 };
  for (const r of allRisks) riskCounts[r.severity] = (riskCounts[r.severity] || 0) + 1;

  const sideEffectTypes = {};
  for (const se of allSideEffects) {
    sideEffectTypes[se.type] = (sideEffectTypes[se.type] || 0) + 1;
  }

  // Security path analysis: flag unvalidated data reaching sinks
  const sinks = steps.filter(s => s.risks.some(r => r.type === 'data-sink'));
  const validationSteps = steps.filter(s =>
    /valid|sanitiz|check|verify|auth|guard/.test((s.name || '').toLowerCase())
  );
  const securityWarning = sinks.length > 0 && validationSteps.length === 0
    ? 'Data reaches external sinks with no detected validation/sanitization steps in path'
    : null;

  // Total estimated complexity
  const totalComplexity = steps.reduce((s, step) => s + (step.complexity || 0), 0);
  const asyncSteps = steps.filter(s => s.isAsync).length;
  const hasWaterfall = asyncSteps > 3 && steps.filter(s => s.isAsync && s.callsOut > 0).length > 2;

  return {
    entry: {
      id: entryAtom.id,
      name: entryAtom.name,
      filePath: entryAtom.filePath,
      isAsync: entryAtom.isAsync,
    },
    summary: {
      reachableFunctions: steps.length,
      uniqueFiles: uniqueFiles.size,
      maxDepthReached: steps.length > 0 ? Math.max(...steps.map(s => s.depth)) : 0,
      totalComplexity,
      asyncSteps,
      hasWaterfall,
      sideEffects: sideEffectTypes,
      riskCounts,
    },
    security: {
      dataSinks: sinks.map(s => `${s.name} (${s.filePath}:${s.line})`),
      validationSteps: validationSteps.map(s => s.name),
      warning: securityWarning,
    },
    steps: steps.map(s => ({
      depth: s.depth,
      name: s.name,
      filePath: s.filePath,
      line: s.line,
      isAsync: s.isAsync,
      complexity: s.complexity,
      sideEffects: s.sideEffects.map(e => e.type),
      risks: s.risks.map(r => `[${r.severity}] ${r.type}: ${r.detail}`),
      callsOut: s.callsOut,
    })),
  };
}

export default { simulate_data_journey };
