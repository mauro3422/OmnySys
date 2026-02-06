/**
 * @fileoverview dependency-loader.js
 * 
 * Servicio: Carga dependencias desde grafo
 * 
 * @module batch-processor/dependency-loader
 */

/**
 * Carga dependencias en un FileChange desde el grafo
 * @param {FileChange} change - Cambio a poblar
 * @param {Object} dependencyGraph - Grafo de dependencias
 */
export function loadDependencies(change, dependencyGraph) {
  if (!dependencyGraph) return;

  const fileInfo = dependencyGraph[change.filePath];
  if (!fileInfo) return;

  // Dependencias: archivos que este archivo importa
  if (fileInfo.dependsOn && Array.isArray(fileInfo.dependsOn)) {
    for (const dep of fileInfo.dependsOn) {
      change.addDependency(dep);
    }
  }

  // Dependientes: archivos que importan este archivo
  if (fileInfo.usedBy && Array.isArray(fileInfo.usedBy)) {
    for (const dependent of fileInfo.usedBy) {
      change.addDependent(dependent);
    }
  }
}

/**
 * Verifica si un cambio tiene dependencias pendientes
 * @param {FileChange} change - Cambio a verificar
 * @param {Set<string>} pendingPaths - Set de rutas pendientes
 * @returns {boolean}
 */
export function hasPendingDependencies(change, pendingPaths) {
  for (const dep of change.dependencies) {
    if (pendingPaths.has(dep)) {
      return true;
    }
  }
  return false;
}
