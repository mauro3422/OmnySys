/**
 * @fileoverview Return flow - Construye aristas para flujo de returns
 * @module graph-builder/edges/return-flow
 */

/**
 * Construye aristas para flujo de returns
 * @param {Array} atoms - Lista de átomos
 * @param {Map} atomById - Mapa de átomos por ID
 * @returns {Array} Aristas de retorno
 */
export function buildReturnEdges(atoms, atomById) {
  const edges = [];

  for (const atom of atoms) {
    const returnOutput = atom.dataFlow?.outputs?.find(o => o.type === 'return');
    
    if (!returnOutput) continue;

    for (const callerId of atom.calledBy || []) {
      const caller = atomById.get(callerId);
      if (!caller) continue;

      const usage = findReturnUsage(caller, atom, returnOutput);
      
      if (usage) {
        edges.push({
          id: `return_${atom.id}_${caller.id}`,
          from: atom.id,
          to: caller.id,
          fromFunction: atom.name,
          toFunction: caller.name,
          type: 'return_flow',
          dataMapping: [{
            source: returnOutput.shape || 'return',
            target: usage.variable,
            transform: 'return_assignment',
            confidence: 0.9
          }],
          isReturnFlow: true,
          usageContext: usage.context
        });
      }
    }
  }

  return edges;
}

/**
 * Encuentra cómo un caller usa el return de un callee
 * @param {Object} caller - Átomo que llama
 * @param {Object} callee - Átomo llamado
 * @param {Object} returnOutput - Output de retorno
 * @returns {Object|null} Información de uso o null
 */
export function findReturnUsage(caller, callee, returnOutput) {
  const callerCode = caller.code || '';
  const calleeName = callee.name;
  
  const assignmentPattern = new RegExp(
    `(const|let|var)\\s+(\\w+)\\s*=\\s*(?:await\\s+)?${calleeName}\\(`,
    'g'
  );
  
  const match = assignmentPattern.exec(callerCode);
  if (match) {
    return {
      variable: match[2],
      context: match[0],
      type: 'assignment'
    };
  }

  const returnPattern = new RegExp(
    `return\\s+(?:await\\s+)?${calleeName}\\(`,
    'g'
  );
  
  if (returnPattern.test(callerCode)) {
    return {
      variable: 'return',
      context: `return ${calleeName}(...)`,
      type: 'direct_return'
    };
  }

  return null;
}
