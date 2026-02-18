/**
 * @fileoverview Atom-level queries
 * @module query/queries/file-query/atoms/atom-query
 */

import { loadAtoms } from '#core/storage/index.js';

/**
 * Builds atom ID from file path and function name
 * @param {string} filePath - File path
 * @param {string} functionName - Function name
 * @returns {string} - Atom ID
 */
function buildAtomId(filePath, functionName) {
  const fileId = filePath.replace(/\\/g, '_').replace(/\//g, '_').replace(/\.[^.]+$/, '');
  return `${fileId}::${functionName}`;
}

/**
 * Obtiene detalles de un átomo específico (función)
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @param {object} [cache] - Caché opcional (UnifiedCacheManager)
 * @returns {Promise<object|null>} - Átomo o null
 */
export async function getAtomDetails(rootPath, filePath, functionName, cache = null) {
  const atomId = buildAtomId(filePath, functionName);

  if (cache) {
    const cached = cache.getAtom(atomId);
    if (cached) return cached;
  }

  const atoms = await loadAtoms(rootPath, filePath);
  const atom = atoms.find(a => a.name === functionName) || null;

  if (atom && cache) {
    cache.setAtom(atomId, atom);
  }

  return atom;
}

/**
 * Busca átomos por arquetipo en todo el proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} archetypeType - Tipo de arquetipo (e.g., 'dead-function', 'hot-path')
 * @returns {Promise<Array>} - Lista de átomos con ese arquetipo
 */
export async function findAtomsByArchetype(rootPath, archetypeType) {
  // TODO: Esto requeriría escanear todos los archivos
  // Por ahora, retornar array vacío
  return [];
}
