/**
 * @fileoverview Position calculator - Determina posición de nodos en chains
 * @module graph-builder/nodes/position
 */

/**
 * Determina posición en chains
 * @param {Object} atom - Átomo a evaluar
 * @param {Array} chains - Chains que contienen el átomo
 * @returns {Array} Posiciones únicas (entry, middle, exit)
 */
export function determinePositionInChains(atom, chains) {
  const positions = [];
  
  for (const chain of chains) {
    const stepIndex = chain.steps.findIndex(s => s.atomId === atom.id);
    if (stepIndex === -1) continue;
    
    if (stepIndex === 0) positions.push('entry');
    else if (stepIndex === chain.steps.length - 1) positions.push('exit');
    else positions.push('middle');
  }
  
  return [...new Set(positions)];
}
