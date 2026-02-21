/**
 * Instance finding utilities
 * @module layer-c-memory/mcp/tools/find-symbol-instances/instance-finder
 */

/**
 * Busca todas las instancias de un símbolo por nombre
 * @param {Array} atoms - Array of all atoms
 * @param {string} symbolName - Symbol name to search for
 * @returns {Array} - Array of matching atoms
 */
export function findAllInstances(atoms, symbolName) {
  return atoms.filter(atom => atom.name === symbolName);
}
