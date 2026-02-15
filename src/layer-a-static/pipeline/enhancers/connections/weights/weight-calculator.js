/**
 * @fileoverview Weight Calculator - Cálculo de pesos de conexiones
 * 
 * @module pipeline/enhancers/connections/weights
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:connections:weights');

/**
 * Calcula pesos de todas las conexiones
 * 
 * @param {Object} connections - Objeto con arrays de conexiones por tipo
 * @param {Array} atoms - Todos los átomos
 * @returns {Array} Conexiones con pesos calculados
 */
export function calculateAllWeights(connections, atoms) {
  const allConnections = [];
  
  // Indexar átomos por ID para lookup rápido
  const atomIndex = new Map(atoms.map(a => [a.id, a]));
  
  // Procesar cada tipo de conexión
  for (const [type, conns] of Object.entries(connections)) {
    for (const conn of conns) {
      const weight = calculateConnectionWeight(conn, atomIndex);
      allConnections.push({
        ...conn,
        weight,
        connectionCategory: getConnectionCategory(weight)
      });
    }
  }
  
  // Ordenar por peso descendente
  return allConnections.sort((a, b) => b.weight - a.weight);
}

/**
 * Calcula peso de una conexión específica
 * @param {Object} conn - Conexión
 * @param {Map} atomIndex - Índice de átomos
 * @returns {number} Peso calculado
 */
export function calculateConnectionWeight(conn, atomIndex) {
  let weight = 0;
  
  // Base según tipo
  const typeWeights = {
    'import': 1.0,
    'export': 1.0,
    'data-flow-chain': 0.8,
    'temporal-dependency': 0.9,
    'cross-file-temporal': 0.85,
    'inherited': 0.6,
    'semantic': 0.7,
    'error-flow': 0.75
  };
  
  weight += typeWeights[conn.type] || 0.5;
  
  // Multiplicar por confianza
  weight *= (conn.confidence || 0.5);
  
  // Bonus por vibration del átomo origen
  const fromAtom = atomIndex.get(conn.from);
  if (fromAtom?.ancestry?.vibrationScore) {
    weight *= (1 + fromAtom.ancestry.vibrationScore * 0.3);
  }
  
  // Penalización por conexiones rotas
  if (conn.status === 'broken') {
    weight *= 0.3;
  }
  
  // Bonus por generación (ancestry más antiguo = más estable)
  if (conn.generation && conn.generation > 1) {
    weight *= (1 + conn.generation * 0.1);
  }
  
  return Math.min(weight, 2.0); // Cap en 2.0
}

/**
 * Categoriza conexión por peso
 * @param {number} weight - Peso de la conexión
 * @returns {string} Categoría
 */
export function getConnectionCategory(weight) {
  if (weight >= 1.2) return 'critical';
  if (weight >= 0.9) return 'strong';
  if (weight >= 0.6) return 'medium';
  return 'weak';
}

/**
 * Obtiene estadísticas de pesos
 * @param {Array} connections - Conexiones con pesos
 * @returns {Object} Estadísticas
 */
export function getWeightStats(connections) {
  if (connections.length === 0) {
    return { average: 0, max: 0, min: 0, critical: 0, strong: 0, medium: 0, weak: 0 };
  }
  
  const weights = connections.map(c => c.weight);
  const categories = connections.reduce((acc, c) => {
    acc[c.connectionCategory] = (acc[c.connectionCategory] || 0) + 1;
    return acc;
  }, {});
  
  return {
    average: weights.reduce((a, b) => a + b, 0) / weights.length,
    max: Math.max(...weights),
    min: Math.min(...weights),
    ...categories
  };
}
