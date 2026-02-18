/**
 * @fileoverview counters.js
 * 
 * Utilidades para contar elementos en el SystemMap.
 * 
 * @module graph/utils/counters
 */

/**
 * Cuenta el total de funciones en todos los archivos
 * @param {Object.<string, Array>} functions - Mapa de functions por archivo
 * @returns {number}
 */
export function countTotalFunctions(functions) {
  if (functions == null) return 0;
  let total = 0;
  for (const funcs of Object.values(functions)) {
    if (Array.isArray(funcs)) {
      total += funcs.length;
    }
  }
  return total;
}

/**
 * Cuenta el total de items en un mapa (types, enums, constants, etc.)
 * @param {Object.<string, Array>} itemsMap - Mapa de items por archivo
 * @returns {number}
 */
export function countTotalItems(itemsMap) {
  if (itemsMap == null) return 0;
  let total = 0;
  for (const items of Object.values(itemsMap)) {
    if (Array.isArray(items)) {
      total += items.length;
    }
  }
  return total;
}

/**
 * Cuenta el total de imports no resueltos
 * @param {Object.<string, Array>} unresolvedImports
 * @returns {number}
 */
export function countUnresolvedImports(unresolvedImports) {
  if (unresolvedImports == null) return 0;
  return Object.values(unresolvedImports)
    .flat()
    .length;
}

/**
 * Cuenta el total de archivos en el sistema
 * @param {Object} filesMap
 * @returns {number}
 */
export function countFiles(filesMap) {
  if (filesMap == null) return 0;
  return Object.keys(filesMap).length;
}

/**
 * Cuenta el total de dependencias únicas
 * @param {Array} dependencies
 * @returns {number}
 */
export function countDependencies(dependencies) {
  if (dependencies == null) return 0;
  return dependencies.length;
}
