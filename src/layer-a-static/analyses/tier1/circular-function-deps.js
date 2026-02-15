/**
 * Circular Function Dependencies Analyzer
 *
 * Responsabilidad:
 * - Detectar ciclos entre funciones (A → B → A)
 * - Clasificar molecularmente usando metadatos reales de átomos
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @param {object} atomsIndex - Índice de átomos del sistema
 * @returns {object} - Reporte de dependencias circulares clasificadas
 */

import { classifyAllFunctionCycles } from './function-cycle-classifier/index.js';

export function findCircularFunctionDeps(systemMap, atomsIndex = {}) {
  // Handle null/undefined input gracefully
  if (!systemMap || !systemMap.function_links) {
    return {
      total: 0,
      cycles: [],
      classifications: [],
      validCount: 0,
      problematicCount: 0,
      hasMutualRecursion: false,
      recommendation: 'No circular function dependencies detected'
    };
  }

  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(nodeId, path) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    // Encontrar todos los links que SALEN de este nodo
    const outgoingLinks = systemMap.function_links.filter(
      link => link.from === nodeId
    );

    for (const link of outgoingLinks) {
      const targetId = link.to;

      if (!visited.has(targetId)) {
        dfs(targetId, [...path]);
      } else if (recursionStack.has(targetId)) {
        // Ciclo encontrado
        const cycleStart = path.indexOf(targetId);
        const cycle = path.slice(cycleStart).concat([targetId]);
        cycles.push({
          cycle: cycle,
          length: cycle.length,
          severity: cycle.length === 2 ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    recursionStack.delete(nodeId);
  }

  // Ejecutar DFS desde cada función
  for (const link of systemMap.function_links) {
    if (!visited.has(link.from)) {
      dfs(link.from, []);
    }
  }

  // Extraer solo los ciclos (sin metadata extra) para el clasificador
  const rawCycles = cycles.map(c => c.cycle);
  
  // Clasificación MOLECULAR usando metadatos de átomos
  const classification = classifyAllFunctionCycles(rawCycles, atomsIndex);
  
  // Separar ciclos por categoría
  const validCycles = classification.classifications.filter(c => 
    c.category === 'VALID_PATTERN' || c.autoIgnore
  );
  
  const problematicCycles = classification.classifications.filter(c =>
    c.category === 'CRITICAL_ISSUE' || c.category === 'REQUIRES_REVIEW'
  );
  
  return {
    total: cycles.length,
    cycles: cycles,
    classifications: classification.classifications,
    validCount: classification.valid,
    problematicCount: classification.problematic,
    // Backwards compatibility
    recursiveFunctions: validCycles.filter(c => 
      c.ruleId === 'direct-recursion' || c.ruleId === 'pure-algorithm-mutual-recursion'
    ),
    mutualRecursion: validCycles.filter(c =>
      c.ruleId === 'mutual-recursion-algorithms' || c.ruleId === 'event-handler-cycle'
    ),
    // Solo ciclos problemáticos afectan métricas
    hasMutualRecursion: problematicCycles.length > 0,
    recommendation: classification.problematic > 0
      ? `Found ${classification.problematic} problematic circular function dependency(ies)`
      : classification.valid > 0
        ? `Found ${classification.valid} valid function cycles (recursion, events, etc.)`
        : 'No circular function dependencies detected'
  };
}

