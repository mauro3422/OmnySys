/**
 * @fileoverview Edge builder - Construye aristas del grafo
 * @module graph-builder/edges/builder
 */

/**
 * Construye aristas del grafo
 * @param {Array} mappings - Mapeos entre funciones
 * @param {Map} atomByName - Mapa de átomos por nombre
 * @param {Array} atoms - Lista de átomos (para returnEdges)
 * @param {Object} helpers - Helpers (determineEdgeType, buildReturnEdges)
 * @returns {Array} Aristas del grafo
 */
export function buildEdges(mappings, atomByName, atoms, helpers) {
  const { determineEdgeType, buildReturnEdges } = helpers;
  const edges = [];

  for (const mapping of mappings) {
    const caller = atomByName.get(mapping.caller);
    const callee = atomByName.get(mapping.callee);

    if (!caller || !callee) continue;

    const edge = {
      id: `edge_${caller.id}_${callee.id}_${mapping.callSite}`,
      from: caller.id,
      to: callee.id,
      fromFunction: mapping.caller,
      toFunction: mapping.callee,
      
      type: determineEdgeType(mapping),
      
      dataMapping: mapping.mappings.map(m => ({
        source: m.argument.variable || m.argument.code,
        target: m.parameter.name,
        transform: m.transform.type,
        confidence: m.confidence
      })),
      
      returnFlow: mapping.returnUsage ? {
        isUsed: mapping.returnUsage.isUsed,
        assignedTo: mapping.returnUsage.assignedTo,
        usages: mapping.returnUsage.usages?.length || 0
      } : null,
      
      callSite: mapping.callSite,
      totalArgs: mapping.totalArgs,
      totalParams: mapping.totalParams,
      
      summary: mapping.summary
    };

    edges.push(edge);
  }

  const returnEdges = buildReturnEdges(atoms, atomByName);
  edges.push(...returnEdges);

  return edges;
}

/**
 * Determina tipo de arista
 * @param {Object} mapping - Mapeo de llamada
 * @returns {string} Tipo de arista
 */
export function determineEdgeType(mapping) {
  const allDirect = mapping.mappings.every(m => m.transform.type === 'DIRECT_PASS');
  if (allDirect) return 'direct_call';
  
  const hasTransforms = mapping.mappings.some(m => 
    m.transform.type !== 'DIRECT_PASS' && 
    m.transform.type !== 'UNKNOWN'
  );
  if (hasTransforms) return 'data_transform';
  
  return 'call';
}
