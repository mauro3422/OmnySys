/**
 * @fileoverview function-resolver.js
 * 
 * Resolución de funciones entre archivos.
 * Determina qué archivo contiene una función llamada.
 * 
 * @module graph/resolvers/function-resolver
 */

import { normalizePath } from '../utils/path-utils.js';

/**
 * Busca una función en los imports resueltos
 * 
 * @param {string} functionName - Nombre de la función a buscar
 * @param {Object} fileInfo - Info del archivo actual
 * @param {Object} resolvedImports - Imports resueltos
 * @param {Object} parsedFiles - Archivos parseados
 * @param {string} currentFile - Archivo actual normalizado
 * @returns {ResolvedFunction|null} - { id, file } de la función encontrada
 */
export function findFunctionInResolution(
  functionName,
  fileInfo,
  resolvedImports,
  parsedFiles,
  currentFile
) {
  if (resolvedImports == null || parsedFiles == null) {
    return null;
  }
  // 1. Buscar en imports del archivo actual
  const imports = resolvedImports[currentFile] || [];

  for (const importInfo of imports) {
    if (!importInfo.resolved) continue;

    const resolvedFile = normalizePath(importInfo.resolved);
    const targetFileInfo = parsedFiles[resolvedFile];

    if (!targetFileInfo) continue;  // Guard: external module or not yet indexed
    const targetAtoms = targetFileInfo.functions || targetFileInfo.atoms;
    if (targetAtoms) {
      const foundFunc = targetAtoms.find(f => f.name === functionName);
      if (foundFunc) {
        return {
          id: foundFunc.id,
          file: resolvedFile
        };
      }
    }
  }

  // 2. Buscar en funciones locales (misma archivo)
  const localAtoms = fileInfo != null ? (fileInfo.functions || fileInfo.atoms) : null;
  if (localAtoms) {
    const localFunc = localAtoms.find(f => f.name === functionName);
    if (localFunc) {
      return {
        id: localFunc.id,
        file: currentFile
      };
    }
  }

  return null;
}

/**
 * Resuelve todas las llamadas de un archivo
 * 
 * @param {Object} fileInfo - Info del archivo
 * @param {Object} resolvedImports - Imports resueltos
 * @param {Object} parsedFiles - Archivos parseados
 * @param {string} currentFile - Archivo actual
 * @returns {ResolvedCall[]} - Array de llamadas resueltas
 */
export function resolveAllFunctionCalls(fileInfo, resolvedImports, parsedFiles, currentFile) {
  const resolvedCalls = [];

  if (fileInfo == null) {
    return resolvedCalls;
  }

  const fileAtoms = fileInfo.functions || fileInfo.atoms;
  if (!fileAtoms || !Array.isArray(fileAtoms)) {
    return resolvedCalls;
  }

  for (const func of fileAtoms) {
    if (!func.calls || !Array.isArray(func.calls)) continue;

    for (const call of func.calls) {
      const target = findFunctionInResolution(
        call.name,
        fileInfo,
        resolvedImports,
        parsedFiles,
        currentFile
      );

      if (target) {
        resolvedCalls.push({
          from: func.id,
          to: target.id,
          line: call.line,
          fileFrom: currentFile,
          fileTo: target.file,
          functionName: call.name
        });
      }
    }
  }

  return resolvedCalls;
}

/**
 * @typedef {Object} ResolvedFunction
 * @property {string} id - ID único de la función
 * @property {string} file - Path del archivo que la contiene
 */

/**
 * @typedef {Object} ResolvedCall
 * @property {string} from - ID función origen
 * @property {string} to - ID función destino
 * @property {number} line - Línea de la llamada
 * @property {string} fileFrom - Archivo origen
 * @property {string} fileTo - Archivo destino
 * @property {string} functionName - Nombre de la función llamada
 */
