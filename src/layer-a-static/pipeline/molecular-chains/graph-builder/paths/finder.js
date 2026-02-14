/**
 * @fileoverview Path finder - Encuentra caminos entre funciones (DFS)
 * @module graph-builder/paths/finder
 */

/**
 * Encuentra caminos entre dos funciones usando DFS
 * @param {string} fromFunction - Nombre función origen
 * @param {string} toFunction - Nombre función destino
 * @param {Map} atomByName - Mapa de átomos por nombre
 * @param {Function} edgesBuilder - Función que construye edges
 * @returns {Array} Lista de caminos
 */
export function findPaths(fromFunction, toFunction, atomByName, edgesBuilder) {
  const fromNode = atomByName.get(fromFunction);
  const toNode = atomByName.get(toFunction);
  
  if (!fromNode || !toNode) return [];

  const paths = [];
  const visited = new Set();
  
  const dfs = (current, path) => {
    if (current === toNode.id) {
      paths.push([...path]);
      return;
    }
    
    if (visited.has(current)) return;
    visited.add(current);
    
    const outgoing = edgesBuilder().filter(e => e.from === current);
    
    for (const edge of outgoing) {
      path.push(edge);
      dfs(edge.to, path);
      path.pop();
    }
    
    visited.delete(current);
  };
  
  dfs(fromNode.id, []);
  
  return paths;
}
