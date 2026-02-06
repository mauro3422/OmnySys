/**
 * @fileoverview path-utils.js
 * 
 * Utilidades para normalización y manejo de paths.
 * Todas las operaciones de path del grafo deben pasar por aquí.
 * 
 * @module graph/utils/path
 */

import path from 'path';

/**
 * Normaliza un path (Windows -> Unix)
 * SSOT: TODA normalización de paths en el grafo usa esta función.
 * 
 * @param {string} filePath
 * @returns {string} Path normalizado con forward slashes
 */
export function normalizePath(filePath) {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Obtiene un path más legible para mostrar
 * Muestra desde "src/" si existe, o solo el nombre del archivo.
 * 
 * @param {string} normalizedPath - Path ya normalizado
 * @returns {string} Path legible
 */
export function getDisplayPath(normalizedPath) {
  // Mostrar desde "src/" en adelante si existe
  const srcIndex = normalizedPath.indexOf('/src/');
  if (srcIndex !== -1) {
    return normalizedPath.substring(srcIndex + 1);
  }
  return normalizedPath.split('/').pop() || normalizedPath;
}

/**
 * Resuelve un import relativo desde un archivo origen
 * 
 * @param {string} fromFile - Archivo desde donde se importa
 * @param {string} importSource - Path del import (ej: './utils' o '../helpers')
 * @param {string} [extension='.js'] - Extensión a agregar si no tiene
 * @returns {string} Path resuelto y normalizado
 */
export function resolveImportPath(fromFile, importSource, extension = '.js') {
  const currentDir = path.dirname(fromFile);
  let resolvedPath = path.join(currentDir, importSource);
  
  // Si no tiene extensión, agregarla
  if (!path.extname(resolvedPath)) {
    resolvedPath += extension;
  }
  
  return normalizePath(resolvedPath);
}

/**
 * Crea un conjunto de paths únicos a partir de un array
 * Útil para eliminar duplicados en usedBy/dependsOn
 * 
 * @param {string[]} paths - Array de paths
 * @returns {string[]} Array sin duplicados, ordenado
 */
export function uniquePaths(paths) {
  return [...new Set(paths)].sort();
}

/**
 * Verifica si dos paths son equivalentes (comparación normalizada)
 * 
 * @param {string} pathA
 * @param {string} pathB
 * @returns {boolean}
 */
export function pathsEqual(pathA, pathB) {
  return normalizePath(pathA) === normalizePath(pathB);
}

/**
 * Obtiene la extensión del archivo en minúsculas
 * 
 * @param {string} filePath
 * @returns {string} Extensión (ej: '.js', '.ts')
 */
export function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Verifica si un path es relativo (empieza con ./ o ../)
 * 
 * @param {string} importSource
 * @returns {boolean}
 */
export function isRelativePath(importSource) {
  return importSource.startsWith('./') || importSource.startsWith('../');
}
