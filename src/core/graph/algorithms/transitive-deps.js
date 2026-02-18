/**
 * @fileoverview transitive-deps.js
 * 
 * Algoritmos para calcular dependencias transitivas (hacia abajo y hacia arriba).
 * 
 * @module graph/algorithms/transitive-deps
 */

/**
 * Calcula dependencias transitivas (archivos que este archivo depende, directa o indirectamente)
 * Es decir: si A importa B, y B importa C, entonces A transitivamente depende de C.
 * 
 * @param {string} filePath - Archivo de partida
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @param {Set<string>} [visited] - Set interno para tracking
 * @returns {Set<string>} - Set de paths de los que depende transitivamente
 */
export function calculateTransitiveDependencies(filePath, files, visited = new Set()) {
  if (!files) return new Set();
  if (visited.has(filePath)) {
    return new Set();
  }

  visited.add(filePath);
  const result = new Set();

  const fileNode = files[filePath];
  if (!fileNode) return result;
  if (!fileNode.dependsOn) return result;

  for (const dependent of fileNode.dependsOn) {
    if (dependent === filePath) continue; // Exclude self
    result.add(dependent);
    const transitive = calculateTransitiveDependencies(dependent, files, visited);
    for (const dep of transitive) {
      result.add(dep);
    }
  }

  return result;
}

/**
 * Calcula dependientes transitivos (archivos que dependen de este, directa o indirectamente)
 * Es decir: si C es importado por B, y B es importado por A, entonces A transitivamente depende de C.
 * 
 * @param {string} filePath - Archivo de partida
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @param {Set<string>} [visited] - Set interno para tracking
 * @returns {Set<string>} - Set de paths que dependen transitivamente de este
 */
export function calculateTransitiveDependents(filePath, files, visited = new Set()) {
  if (!files) return new Set();
  if (visited.has(filePath)) {
    return new Set();
  }

  visited.add(filePath);
  const result = new Set();

  const fileNode = files[filePath];
  if (!fileNode) return result;
  if (!fileNode.usedBy) return result;

  for (const dependent of fileNode.usedBy) {
    if (dependent === filePath) continue; // Exclude self
    result.add(dependent);
    const transitive = calculateTransitiveDependents(dependent, files, visited);
    for (const dep of transitive) {
      result.add(dep);
    }
  }

  return result;
}

/**
 * Calcula las dependencias transitivas para TODOS los archivos de una vez
 * Más eficiente que llamar calculateTransitiveDependencies para cada archivo.
 * 
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @returns {Object.<string, string[]>} - Mapa de path -> dependencias transitivas
 */
export function calculateAllTransitiveDependencies(files) {
  const result = {};
  
  if (!files) return result;
  
  for (const filePath of Object.keys(files)) {
    const deps = calculateTransitiveDependencies(filePath, files, new Set());
    result[filePath] = Array.from(deps);
  }
  
  return result;
}

/**
 * Calcula los dependientes transitivos para TODOS los archivos de una vez
 * 
 * @param {Object.<string, FileNode>} files - Mapa de archivos
 * @returns {Object.<string, string[]>} - Mapa de path -> dependientes transitivos
 */
export function calculateAllTransitiveDependents(files) {
  const result = {};
  
  if (!files) return result;
  
  for (const filePath of Object.keys(files)) {
    const deps = calculateTransitiveDependents(filePath, files, new Set());
    result[filePath] = Array.from(deps);
  }
  
  return result;
}
