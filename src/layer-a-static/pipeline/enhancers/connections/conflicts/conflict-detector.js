/**
 * @fileoverview Conflict Detector - Detección de conflictos entre conexiones
 * 
 * @module pipeline/enhancers/connections/conflicts
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:connections:conflicts');

/**
 * Detecta conflictos potenciales entre conexiones
 * 
 * @param {Array} connections - Todas las conexiones
 * @returns {Array} Conflictos detectados
 */
export function detectConnectionConflicts(connections) {
  const conflicts = [];
  
  // Detectar ciclos temporales
  const temporalCycles = detectTemporalCycles(connections);
  conflicts.push(...temporalCycles);
  
  // Detectar race conditions potenciales
  const raceConditions = detectRaceConditions(connections);
  conflicts.push(...raceConditions);
  
  logger.debug(`Detected ${conflicts.length} conflicts`);
  return conflicts;
}

/**
 * Detecta ciclos temporales
 * @param {Array} connections - Conexiones
 * @returns {Array} Conflictos de ciclo
 */
function detectTemporalCycles(connections) {
  const conflicts = [];
  
  const temporalConns = connections.filter(c => 
    c.type.includes('temporal') && c.relationship === 'must-run-before'
  );
  
  // Grafo de dependencias temporales
  const graph = new Map();
  for (const conn of temporalConns) {
    if (!graph.has(conn.from)) graph.set(conn.from, []);
    graph.get(conn.from).push(conn.to);
  }
  
  // Detectar ciclos con DFS
  const visited = new Set();
  const recStack = new Set();
  
  function hasCycle(node, path = []) {
    visited.add(node);
    recStack.add(node);
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, [...path, node])) return true;
      } else if (recStack.has(neighbor)) {
        // Ciclo detectado
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), node, neighbor];
        
        conflicts.push({
          type: 'temporal-cycle',
          severity: 'critical',
          cycle,
          message: 'Circular temporal dependency detected',
          fix: 'Review initialization order'
        });
        return true;
      }
    }
    
    recStack.delete(node);
    return false;
  }
  
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      hasCycle(node);
    }
  }
  
  return conflicts;
}

/**
 * Detecta race conditions potenciales
 * @param {Array} connections - Conexiones
 * @returns {Array} Conflictos de race condition
 */
function detectRaceConditions(connections) {
  const conflicts = [];
  
  const samePhaseConns = connections.filter(c => 
    c.relationship === 'same-execution-phase' && c.potentialRace
  );
  
  for (const conn of samePhaseConns) {
    conflicts.push({
      type: 'potential-race',
      severity: 'warning',
      between: [conn.from, conn.to],
      phase: conn.phase,
      message: `Functions ${conn.from} and ${conn.to} run in same phase - potential race`,
      fix: 'Consider explicit ordering or synchronization'
    });
  }
  
  return conflicts;
}

/**
 * Verifica si hay conflictos críticos
 * @param {Array} conflicts - Conflictos detectados
 * @returns {boolean} true si hay conflictos críticos
 */
export function hasCriticalConflicts(conflicts) {
  return conflicts.some(c => c.severity === 'critical');
}

/**
 * Agrupa conflictos por severidad
 * @param {Array} conflicts - Conflictos
 * @returns {Object} Conflictos agrupados
 */
export function groupConflictsBySeverity(conflicts) {
  return conflicts.reduce((acc, conflict) => {
    const sev = conflict.severity || 'unknown';
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(conflict);
    return acc;
  }, {});
}
