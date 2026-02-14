/**
 * @fileoverview Node builder - Construye nodos del grafo desde átomos
 * @module graph-builder/nodes/builder
 */

/**
 * Construye nodos del grafo
 * @param {Array} atoms - Lista de átomos
 * @param {Array} chains - Lista de chains
 * @param {Object} helpers - Helpers (determineNodeType, determinePositionInChains)
 * @returns {Array} Nodos del grafo
 */
export function buildNodes(atoms, chains, helpers) {
  const { determineNodeType, determinePositionInChains } = helpers;
  
  return atoms.map(atom => {
    const type = determineNodeType(atom, atoms);
    
    const atomChains = chains.filter(c => 
      c.steps.some(s => s.atomId === atom.id)
    );

    return {
      id: atom.id,
      function: atom.name,
      type,
      
      inputs: (atom.dataFlow?.inputs || []).map(i => ({
        name: i.name,
        type: i.type || 'any'
      })),
      
      outputs: (atom.dataFlow?.outputs || []).map(o => ({
        type: o.type,
        ...(o.type === 'return' && { data: o.shape || 'unknown' }),
        ...(o.type === 'side_effect' && { target: o.target })
      })),
      
      complexity: atom.complexity || 0,
      hasSideEffects: atom.hasSideEffects || false,
      isExported: atom.isExported || false,
      
      chains: atomChains.map(c => c.id),
      
      position: determinePositionInChains(atom, atomChains)
    };
  });
}

/**
 * Determina tipo de nodo
 * @param {Object} atom - Átomo a evaluar
 * @param {Array} atoms - Lista de todos los átomos
 * @returns {string} Tipo de nodo (entry, exit, intermediate, isolated)
 */
export function determineNodeType(atom, atoms) {
  const atomByName = new Map(atoms.map(a => [a.name, a]));
  
  // Entry: exportada o tiene callers externos
  if (atom.isExported) return 'entry';
  
  const hasExternalCallers = atom.calledBy?.some(callerId => {
    const callerName = callerId.split('::').pop();
    return !atomByName.has(callerName);
  });
  
  if (hasExternalCallers) return 'entry';
  
  // Exit: no tiene calls internos
  const hasInternalCalls = atom.calls?.some(c => c.type === 'internal');
  if (!hasInternalCalls) return 'exit';
  
  // Intermediate: tiene callers y callees
  if ((atom.calledBy?.length > 0) && hasInternalCalls) {
    return 'intermediate';
  }
  
  return 'isolated';
}
