/**
 * @fileoverview function-links.js
 * 
 * Construcción de los enlaces entre funciones (function_links).
 * 
 * @module graph/builders/function-links
 */

import { createFunctionLink } from '../core/types.js';
import { resolveAllFunctionCalls } from '../resolvers/function-resolver.js';

/**
 * Construye los enlaces entre funciones para todo el sistema
 * 
 * @param {Object} parsedFiles - Mapa de archivos parseados
 * @param {Object} resolvedImports - Imports resueltos
 * @returns {{functions: Object, function_links: Array}} - Funciones y enlaces
 */
export function buildFunctionLinks(parsedFiles, resolvedImports) {
  const functions = {};
  const function_links = [];
  
  if (!parsedFiles) return { functions, function_links };

  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    // Guardar funciones del archivo
    if (fileInfo.functions && Array.isArray(fileInfo.functions)) {
      functions[filePath] = fileInfo.functions;

      // Resolver y crear enlaces
      const resolvedCalls = resolveAllFunctionCalls(
        fileInfo,
        resolvedImports,
        parsedFiles,
        filePath
      );

      for (const call of resolvedCalls) {
        function_links.push(
          createFunctionLink(call.from, call.to, {
            line: call.line,
            fileFrom: call.fileFrom,
            fileTo: call.fileTo
          })
        );
      }
    }
  }

  return { functions, function_links };
}

/**
 * Obtiene todos los enlaces que salen de una función
 * 
 * @param {string} funcId - ID de la función
 * @param {Array} function_links - Todos los enlaces
 * @returns {Array} - Enlaces que salen de esta función
 */
export function getOutgoingLinks(funcId, function_links) {
  if (!function_links || !Array.isArray(function_links)) return [];
  return function_links.filter(link => link.from === funcId);
}

/**
 * Obtiene todos los enlaces que entran a una función
 * 
 * @param {string} funcId - ID de la función
 * @param {Array} function_links - Todos los enlaces
 * @returns {Array} - Enlaces que entran a esta función
 */
export function getIncomingLinks(funcId, function_links) {
  if (!function_links || !Array.isArray(function_links)) return [];
  return function_links.filter(link => link.to === funcId);
}

/**
 * Encuentra todas las funciones llamadas recursivamente por una función
 * 
 * @param {string} funcId - ID de la función de partida
 * @param {Array} function_links - Todos los enlaces
 * @param {Set<string>} [visited] - Set para tracking
 * @returns {Set<string>} - IDs de funciones alcanzables
 */
export function findReachableFunctions(funcId, function_links, visited = new Set()) {
  if (visited.has(funcId)) return visited;
  
  visited.add(funcId);
  
  const outgoing = getOutgoingLinks(funcId, function_links);
  for (const link of outgoing) {
    findReachableFunctions(link.to, function_links, visited);
  }
  
  return visited;
}
