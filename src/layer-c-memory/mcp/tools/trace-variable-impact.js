/**
 * Tool: trace_variable_impact
 *
 * Weighted BFS influence propagation through the atom call graph.
 * Math model: PageRank-like decay (α=0.75/hop, boost=usageCount/5).
 *
 * USA el módulo estándar de enrichment para relaciones.
 *
 * @module mcp/tools/trace-variable-impact
 */

import { queryAtoms, getAtomsInFile, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:trace-variable');

// Factor de decaimiento por salto
const DECAY = 0.75;

/**
 * Dado un átomo fuente y el nombre de una variable, rastrea cómo fluye
 * ese dato hacia los átomos que llama — con pesos de impacto.
 */
// ── Private helpers ───────────────────────────────────────────────────────────

function buildAtomIndices(allAtoms) {
  const byId = new Map(allAtoms.map(a => [a.id, a]));
  const byName = new Map();
  for (const a of allAtoms) {
    if (!a.name) continue;
    if (!byName.has(a.name)) byName.set(a.name, []);
    byName.get(a.name).push(a);
  }
  return { byId, byName };
}

function findSourceAtom(allAtoms, filePath, symbolName) {
  return allAtoms.find(a =>
    a.name === symbolName &&
    (a.filePath === filePath || a.filePath?.endsWith('/' + filePath) || a.id?.startsWith(filePath))
  ) || null;
}

function validateParameters(args) {
  const { filePath, symbolName, variableName } = args;
  if (!filePath || !symbolName || !variableName) {
    return { valid: false, error: 'Missing required parameters: filePath, symbolName, variableName' };
  }
  return { valid: true };
}

async function loadAndEnrichAtoms(filePath, symbolName, projectPath) {
  let atoms;
  if (filePath) {
    atoms = await getAtomsInFile(projectPath, filePath);
  } else {
    const allAtoms = await queryAtoms(projectPath, {});
    atoms = allAtoms.filter(a => a.name === symbolName);
  }
  
  if (!atoms || atoms.length === 0) {
    return { atoms: null, error: `No atoms found for: ${filePath || symbolName}`, suggestion: 'Check filePath or symbolName' };
  }
  
  let enrichedAtoms = await enrichAtomsWithRelations(atoms, {
    scope: 'ids', ids: atoms.map(a => a.id), withStats: true, withCallers: true, withCallees: true
  }, projectPath);
  
  const externalIds = new Set();
  for (const atom of enrichedAtoms) {
    if (atom.callers) for (const callerId of atom.callers) if (!atoms.find(a => a.id === callerId)) externalIds.add(callerId);
    if (atom.callees) for (const calleeId of atom.callees) if (!atoms.find(a => a.id === calleeId)) externalIds.add(calleeId);
  }
  
  if (externalIds.size > 0) {
    const { queryAtoms: queryAtomsStorage } = await import('#layer-c/storage/index.js');
    const externalAtoms = await queryAtomsStorage(projectPath, { ids: Array.from(externalIds) });
    if (externalAtoms?.length > 0) {
      const enrichedExternal = await enrichAtomsWithRelations(externalAtoms, {
        scope: 'ids', ids: externalAtoms.map(a => a.id), withStats: true, withCallers: true, withCallees: true
      }, projectPath);
      enrichedAtoms = [...enrichedAtoms, ...enrichedExternal];
    }
  }
  
  return { atoms: enrichedAtoms, error: null };
}

function findSourceAtomWithVerification(enrichedAtoms, filePath, symbolName, variableName) {
  const sourceAtom = findSourceAtom(enrichedAtoms, filePath, symbolName);
  if (!sourceAtom) {
    return { sourceAtom: null, error: `Atom not found: ${filePath}::${symbolName}`, suggestion: 'Check filePath and symbolName' };
  }
  
  const sourceInputs = sourceAtom.dataFlow?.inputs || [];
  const allVarNames = [...sourceInputs.map(i => i.name), ...Object.keys(sourceAtom.dataFlow?.analysis?.inferredTypes?.variables || {})];
  const variableFound = allVarNames.some(v => v === variableName || v.startsWith(variableName + '.') || variableName.startsWith(v + '.'));
  
  return { sourceAtom, variableFound, error: null };
}

function runBFSPropagation(sourceAtom, enrichedAtoms, variableName, maxDepth) {
  const { byName } = buildAtomIndices(enrichedAtoms);
  const visited = new Set([sourceAtom.id]);
  const queue = [{ atom: sourceAtom, score: 1.0, hop: 0, path: [sourceAtom.id], variableName }];
  const impactNodes = [];
  const impactEdges = [];
  
  while (queue.length > 0) {
    const { atom, score, hop, path, variableName: currentVar } = queue.shift();
    
    if (hop > 0) {
      impactNodes.push({
        atomId: atom.id, name: atom.name, filePath: atom.filePath,
        score: Math.round(score * 1000) / 1000, hop,
        archetype: atom.archetype?.type || 'unknown',
        impactLevel: score >= 0.75 ? 'high' : score >= 0.4 ? 'medium' : 'low',
        variableName: currentVar, reason: _buildReason(atom, currentVar, hop)
      });
    }
    
    if (hop >= maxDepth) continue;
    
    const calls = [...(atom.calls || []), ...(atom.internalCalls || []), ...(atom.externalCalls || [])];
    
    for (const call of calls) {
      if (!call.name) continue;
      const callName = call.name.includes('.') ? call.name.split('.').pop() : call.name;
      const candidates = byName.get(callName) || [];
      
      for (const callee of candidates) {
        if (visited.has(callee.id) || callee.id === atom.id) continue;
        
        const calleeInputs = callee.dataFlow?.inputs || [];
        const matchedInput = calleeInputs.find(inp => inp.name === currentVar || currentVar.includes(inp.name) || inp.name.includes(currentVar.split('.')[0]));
        const usageCount = matchedInput?.usages?.length ?? 1;
        const boost = Math.min(1.0, usageCount / 5);
        
        if (!matchedInput && hop > 0) continue;
        
        const connectionStrength = matchedInput ? boost : 0.4;
        const propagatedScore = score * DECAY * connectionStrength;
        
        if (propagatedScore < 0.05) continue;
        
        visited.add(callee.id);
        impactEdges.push({
          from: atom.id, to: callee.id, weight: Math.round(propagatedScore * 1000) / 1000,
          variableMatched: matchedInput?.name || null,
          connectionType: matchedInput ? 'direct-parameter' : 'indirect-call'
        });
        
        queue.push({ atom: callee, score: propagatedScore, hop: hop + 1, path: [...path, callee.id], variableName: matchedInput?.name || currentVar });
      }
    }
  }
  
  return { impactNodes, impactEdges };
}

function buildResultObject(sourceAtom, impactNodes, impactEdges, variableFound, variableName) {
  impactNodes.sort((a, b) => b.score - a.score);
  const highImpact = impactNodes.filter(n => n.impactLevel === 'high');
  const medImpact = impactNodes.filter(n => n.impactLevel === 'medium');
  const lowImpact = impactNodes.filter(n => n.impactLevel === 'low');
  const affectedFiles = [...new Set(impactNodes.map(n => n.filePath).filter(Boolean))];
  
  return {
    source: { atomId: sourceAtom.id, name: sourceAtom.name, filePath: sourceAtom.filePath, variable: variableName, variableFoundInSource: variableFound, archetype: sourceAtom.archetype?.type || 'unknown' },
    graph: { totalNodes: impactNodes.length, totalEdges: impactEdges.length, affectedFiles: affectedFiles.length, maxHopReached: Math.max(0, ...impactNodes.map(n => n.hop)), distribution: { high: highImpact.length, medium: medImpact.length, low: lowImpact.length }, totalImpactMass: Math.round(impactNodes.reduce((s, n) => s + n.score, 0) * 100) / 100 },
    impactChain: impactNodes.slice(0, 20), edges: impactEdges.slice(0, 30), affectedFiles: affectedFiles.slice(0, 15),
    math: { model: 'weighted-BFS influence propagation', decayFactor: DECAY, formula: `score(hop_n) = score(hop_n-1) × ${DECAY} × usageBoost`, interpretation: 'Score 1.0 = cambio directo garantizado. Score 0.1 = impacto posible pero indirecto.' }
  };
}

export async function trace_variable_impact(args, context) {
  const { filePath, symbolName, variableName, maxDepth = 3 } = args;
  const { projectPath } = context;
  logger.error(`[Tool] trace_variable_impact("${filePath}", "${symbolName}", "${variableName}")`);

  const validation = validateParameters(args);
  if (!validation.valid) return { error: validation.error };
  
  const { atoms, error: loadError, suggestion } = await loadAndEnrichAtoms(filePath, symbolName, projectPath);
  if (loadError) return { error: loadError, suggestion };
  
  const { sourceAtom, variableFound, error: findError, suggestion: findSuggestion } = findSourceAtomWithVerification(atoms, filePath, symbolName, variableName);
  if (findError) return { error: findError, suggestion: findSuggestion };
  
  const { impactNodes, impactEdges } = runBFSPropagation(sourceAtom, atoms, variableName, maxDepth);
  return buildResultObject(sourceAtom, impactNodes, impactEdges, variableFound, variableName);
}

function _buildReason(atom, variableName, hop) {
  const inputs = atom.dataFlow?.inputs || [];
  const match = inputs.find(i => i.name === variableName || variableName.includes(i.name));
  if (match) {
    const usages = match.usages?.length ?? 0;
    return `Receives '${match.name}' as parameter (used ${usages}x inside)`;
  }
  return `Called indirectly (hop ${hop}) — variable may flow through`;
}
