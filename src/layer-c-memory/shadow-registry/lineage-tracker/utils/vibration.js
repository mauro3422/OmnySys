/**
 * @fileoverview Vibration Utilities
 * 
 * Calcula scores de vibración para átomos.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/utils/vibration
 */

/**
 * Calcula el score de vibración (intensidad de conexiones)
 * @param {Object} atom - Átomo a evaluar
 * @returns {number} Score 0-1
 */
export function calculateVibrationScore(atom) {
  const connections = atom.connections || [];
  if (connections.length === 0) return 0;
  
  // Promedio ponderado de pesos de conexión
  const totalWeight = connections.reduce((sum, c) => sum + (c.weight || 1), 0);
  const avgWeight = totalWeight / connections.length;
  
  // Factor de complejidad
  const complexity = atom.dna?.complexityScore || 5;
  
  // Normalizar a 0-1
  return Math.min(1, (avgWeight * connections.length * complexity) / 100);
}
