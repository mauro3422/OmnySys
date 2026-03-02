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
 * Calcula el peso de una conexión basado en metadata
 * @param {Object} call - Info de la llamada
 * @param {Object} targetAtom - Átomo destino (si está disponible)
 * @returns {number} - Peso entre 0.0 y 1.0
 */
function calculateEdgeWeight(call, targetAtom) {
  let weight = 0.5; // Base weight

  // +0.2 si es API_EXPORT (public API)
  if (targetAtom?.purpose === 'API_EXPORT') {
    weight += 0.2;
  }

  // +0.15 si tiene callers (es un hub)
  if (targetAtom?.calledBy?.length > 5) {
    weight += 0.15;
  }

  // +0.1 si es async (más importante para entender flujo)
  if (targetAtom?.isAsync) {
    weight += 0.1;
  }

  // -0.2 si es TEST_HELPER (menos importante para producción)
  if (targetAtom?.purpose === 'TEST_HELPER') {
    weight -= 0.2;
  }

  // Normalizar entre 0.1 y 1.0
  return Math.max(0.1, Math.min(1.0, weight));
}

/**
 * Determina el tipo de llamada
 * @param {Object} call - Info de la llamada
 * @param {Object} targetAtom - Átomo destino
 * @returns {string} - 'sync', 'async', 'event', 'dynamic'
 */
function determineCallType(call, targetAtom) {
  if (targetAtom?.purpose === 'EVENT_HANDLER') {
    return 'event';
  }
  if (targetAtom?.purpose === 'TIMER_ASYNC') {
    return 'async';
  }
  if (targetAtom?.isAsync) {
    return 'async';
  }
  if (call.dynamic || call.type === 'dynamic') {
    return 'dynamic';
  }
  return 'sync';
}

/**
 * Construye los enlaces entre funciones para todo el sistema
 * 
 * @param {Object} parsedFiles - Mapa de archivos parseados
 * @param {Object} resolvedImports - Imports resueltos
 * @param {Map} [atomsMap] - Mapa de átomos con metadata (opcional, v0.9.36+)
 * @returns {{functions: Object, function_links: Array}} - Funciones y enlaces
 */
export function buildFunctionLinks(parsedFiles, resolvedImports, atomsMap = null) {
  const functions = {};
  const function_links = [];

  if (!parsedFiles) return { functions, function_links };

  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    // Guardar funciones del archivo (compatibilidad legacy y atoms)
    const fileFunctions = fileInfo.functions || fileInfo.atoms;
    if (fileFunctions && Array.isArray(fileFunctions)) {
      functions[filePath] = fileFunctions;

      // Resolver y crear enlaces
      const resolvedCalls = resolveAllFunctionCalls(
        fileInfo,
        resolvedImports,
        parsedFiles,
        filePath
      );

      for (const call of resolvedCalls) {
        // v0.9.36: Buscar átomo destino para obtener purpose y metadata
        const targetAtom = atomsMap ? atomsMap.get(call.to) : null;

        // Calcular peso y tipo de llamada
        const weight = calculateEdgeWeight(call, targetAtom);
        const callType = determineCallType(call, targetAtom);
        const purpose = targetAtom?.purpose || null;

        function_links.push(
          createFunctionLink(call.from, call.to, {
            line: call.line,
            fileFrom: call.fileFrom,
            fileTo: call.fileTo,
            // v0.9.36: Purpose-aware edges
            purpose,
            weight,
            callType
          })
        );
      }
    }
  }

  return { functions, function_links };
}

/**
 * Construye enlaces filtrados por purpose (v0.9.36+)
 * 
 * @param {Array} function_links - Todos los enlaces
 * @param {string[]} includePurposes - Purposes a incluir
 * @returns {Array} - Enlaces filtrados
 */
export function filterLinksByPurpose(function_links, includePurposes) {
  if (!function_links || !Array.isArray(function_links)) return [];
  if (!includePurposes || includePurposes.length === 0) return function_links;

  return function_links.filter(link =>
    link.purpose && includePurposes.includes(link.purpose)
  );
}

/**
 * Construye subgrafo para un purpose específico (v0.9.36+)
 * 
 * @param {Array} function_links - Todos los enlaces
 * @param {Object} functions - Funciones por archivo
 * @param {Map} atomsMap - Mapa de átomos
 * @param {string} purpose - Purpose objetivo
 * @returns {{nodes: Array, edges: Array}} - Subgrafo
 */
export function buildPurposeSubgraph(function_links, functions, atomsMap, purpose) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  // Encontrar átomos del purpose
  if (atomsMap) {
    for (const [atomId, atom] of atomsMap) {
      if (atom.purpose === purpose) {
        nodeIds.add(atomId);
        nodes.push({
          id: atomId,
          name: atom.name,
          file: atom.filePath,
          purpose: atom.purpose,
          isAsync: atom.isAsync,
          complexity: atom.complexity
        });
      }
    }
  }

  // Filtrar edges que conectan nodos del purpose
  for (const link of function_links) {
    if (link.purpose === purpose || nodeIds.has(link.to)) {
      edges.push(link);
    }
  }

  return { nodes, edges };
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
