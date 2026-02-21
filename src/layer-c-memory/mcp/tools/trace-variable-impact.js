/**
 * Tool: trace_variable_impact
 *
 * Weighted BFS influence propagation through the atom call graph.
 * Math model: PageRank-like decay (α=0.75/hop, boost=usageCount/5).
 *
 * @module mcp/tools/trace-variable-impact
 */

import { getAllAtoms } from '#layer-c/storage/atoms/atom.js';
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

export async function trace_variable_impact(args, context) {
  const { filePath, symbolName, variableName, maxDepth = 3 } = args;
  const { projectPath } = context;

  logger.error(`[Tool] trace_variable_impact("${filePath}", "${symbolName}", "${variableName}")`);

  if (!filePath || !symbolName || !variableName) {
    return {
      error: 'Missing required parameters: filePath, symbolName, variableName'
    };
  }

  const allAtoms = await getAllAtoms(projectPath);
  const { byName } = buildAtomIndices(allAtoms);

  const sourceAtom = findSourceAtom(allAtoms, filePath, symbolName);
  if (!sourceAtom) {
    return {
      error: `Atom not found: ${filePath}::${symbolName}`,
      suggestion: 'Check filePath and symbolName'
    };
  }

  // Verificar que la variable existe en el átomo fuente
  const sourceInputs = sourceAtom.dataFlow?.inputs || [];
  const sourceOutputs = sourceAtom.dataFlow?.outputs || [];
  const allVarNames = [
    ...sourceInputs.map(i => i.name),
    ...Object.keys(sourceAtom.dataFlow?.analysis?.inferredTypes?.variables || {})
  ];

  const variableFound = allVarNames.some(v =>
    v === variableName || v.startsWith(variableName + '.') || variableName.startsWith(v + '.')
  );

  // BFS ponderado por el grafo de llamadas
  // Cada entrada: { atomId, score, hop, path, variableInCallee }
  const visited = new Set([sourceAtom.id]);
  const queue = [{
    atom: sourceAtom,
    score: 1.0,
    hop: 0,
    path: [sourceAtom.id],
    variableName: variableName
  }];

  const impactNodes = [];
  const impactEdges = [];

  while (queue.length > 0) {
    const { atom, score, hop, path, variableName: currentVar } = queue.shift();

    if (hop > 0) {
      impactNodes.push({
        atomId: atom.id,
        name: atom.name,
        filePath: atom.filePath,
        score: Math.round(score * 1000) / 1000,
        hop,
        archetype: atom.archetype?.type || 'unknown',
        impactLevel: score >= 0.75 ? 'high' : score >= 0.4 ? 'medium' : 'low',
        variableName: currentVar,
        reason: _buildReason(atom, currentVar, hop)
      });
    }

    if (hop >= maxDepth) continue;

    // Obtener llamadas salientes del átomo actual
    const calls = [
      ...(atom.calls || []),
      ...(atom.internalCalls || []),
      ...(atom.externalCalls || [])
    ];

    for (const call of calls) {
      if (!call.name) continue;

      // Resolver el átomo que se llama
      const callName = call.name.includes('.') ? call.name.split('.').pop() : call.name;
      const candidates = byName.get(callName) || [];

      for (const callee of candidates) {
        if (visited.has(callee.id)) continue;
        if (callee.id === atom.id) continue;

        // ¿Aparece nuestra variable en los inputs del callee?
        const calleeInputs = callee.dataFlow?.inputs || [];
        const calleeVarNames = Object.keys(callee.dataFlow?.analysis?.inferredTypes?.variables || {});

        // Buscar match por nombre de variable o nombre de parámetro
        const matchedInput = calleeInputs.find(inp =>
          inp.name === currentVar ||
          currentVar.includes(inp.name) ||
          inp.name.includes(currentVar.split('.')[0])
        );

        // Calcular boost basado en la cantidad de usos de la variable en el callee
        // El campo real es `usages` (array), no `usageCount`
        const usageCount = matchedInput?.usages?.length ?? 1;
        const boost = Math.min(1.0, usageCount / 5);

        // Calcular score propagado
        // Solo propagar "indirect-call" en hop 0 (salto directo desde la fuente).
        // A partir de hop 1, si no hay match de variable en el callee, es ruido —
        // son llamadas genéricas (Map.has, cache.set) que no transportan la variable.
        if (!matchedInput && hop > 0) continue;

        // Si no hay match directo de variable, la conexión es más débil (×0.4)
        const connectionStrength = matchedInput ? boost : 0.4;
        const propagatedScore = score * DECAY * connectionStrength;

        if (propagatedScore < 0.05) continue; // Cortar ramas con impacto negligible

        visited.add(callee.id);

        // Registrar la arista del grafo
        impactEdges.push({
          from: atom.id,
          to: callee.id,
          weight: Math.round(propagatedScore * 1000) / 1000,
          variableMatched: matchedInput?.name || null,
          connectionType: matchedInput ? 'direct-parameter' : 'indirect-call'
        });

        const propagatedVar = matchedInput?.name || currentVar;

        queue.push({
          atom: callee,
          score: propagatedScore,
          hop: hop + 1,
          path: [...path, callee.id],
          variableName: propagatedVar
        });
      }
    }
  }

  // Ordenar por score descendiente
  impactNodes.sort((a, b) => b.score - a.score);

  // Calcular estadísticas del grafo de impacto
  const highImpact = impactNodes.filter(n => n.impactLevel === 'high');
  const medImpact = impactNodes.filter(n => n.impactLevel === 'medium');
  const lowImpact = impactNodes.filter(n => n.impactLevel === 'low');

  // Archivos únicos afectados
  const affectedFiles = [...new Set(impactNodes.map(n => n.filePath).filter(Boolean))];

  return {
    source: {
      atomId: sourceAtom.id,
      name: sourceAtom.name,
      filePath: sourceAtom.filePath,
      variable: variableName,
      variableFoundInSource: variableFound,
      archetype: sourceAtom.archetype?.type || 'unknown'
    },
    graph: {
      // Métricas del grafo de propagación
      totalNodes: impactNodes.length,
      totalEdges: impactEdges.length,
      affectedFiles: affectedFiles.length,
      maxHopReached: Math.max(0, ...impactNodes.map(n => n.hop)),
      // Distribución de impacto (como en PageRank: cuántos nodos en cada nivel)
      distribution: {
        high: highImpact.length,
        medium: medImpact.length,
        low: lowImpact.length
      },
      // Score total = suma de todos los pesos (análogo a "masa" del impacto)
      totalImpactMass: Math.round(impactNodes.reduce((s, n) => s + n.score, 0) * 100) / 100
    },
    // Nodos ordenados por score (mayor impacto primero)
    impactChain: impactNodes.slice(0, 20),
    // Aristas del grafo para visualización
    edges: impactEdges.slice(0, 30),
    // Archivos que habría que revisar/cambiar
    affectedFiles: affectedFiles.slice(0, 15),
    math: {
      model: 'weighted-BFS influence propagation',
      decayFactor: DECAY,
      formula: `score(hop_n) = score(hop_n-1) × ${DECAY} × usageBoost`,
      interpretation: 'Score 1.0 = cambio directo garantizado. Score 0.1 = impacto posible pero indirecto.'
    }
  };
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
