/**
 * @fileoverview route-connections.js
 *
 * Detecta conexiones entre archivos basadas en rutas API compartidas
 * (server-side routes <-> client-side fetches)
 *
 * @module extractors/static/route-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';
import { normalizeRoute, isValidRoute } from './route-extractor.js';

function normalizeRouteSummary(routes = {}) {
  const byNormalized = new Map();

  for (const route of routes.all || []) {
    if (!isValidRoute(route.route)) continue;

    const normalized = normalizeRoute(route.route);
    byNormalized.set(normalized, route);
  }

  return byNormalized;
}

function buildRouteIndex(fileResults = {}) {
  const index = new Map();

  for (const [filePath, results] of Object.entries(fileResults)) {
    const routeMap = normalizeRouteSummary(results?.routes || {});

    for (const [normalizedRoute, route] of routeMap) {
      if (!index.has(normalizedRoute)) {
        index.set(normalizedRoute, []);
      }

      index.get(normalizedRoute).push({ filePath, route });
    }
  }

  return index;
}

/**
 * Detecta conexiones entre archivos basadas en rutas API compartidas
 * @param {Object} fileResults - Mapa de filePath -> {routes, ...}
 * @returns {Array} - Conexiones detectadas
 */
export function detectRouteConnections(fileResults) {
  const connections = [];
  const index = buildRouteIndex(fileResults);

  for (const [normalized, entries] of index) {
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      const entryA = entries[i];

      for (let j = i + 1; j < entries.length; j++) {
        const entryB = entries[j];

        const isServerA = entryA.route.type === 'server';
        const isServerB = entryB.route.type === 'server';
        let direction;
        let sourceFile;
        let targetFile;

        if (isServerA && !isServerB) {
          direction = `${entryA.filePath} serves, ${entryB.filePath} consumes`;
          sourceFile = entryA.filePath;
          targetFile = entryB.filePath;
        } else if (!isServerA && isServerB) {
          direction = `${entryB.filePath} serves, ${entryA.filePath} consumes`;
          sourceFile = entryB.filePath;
          targetFile = entryA.filePath;
        } else {
          direction = 'both access';
          sourceFile = entryA.filePath;
          targetFile = entryB.filePath;
        }

        connections.push({
          id: `route-${sourceFile}-${targetFile}-${normalized}`,
          sourceFile,
          targetFile,
          type: ConnectionType.SHARED_ROUTE,
          via: 'route',
          route: entryA.route.route,
          normalizedRoute: normalized,
          direction,
          confidence: DEFAULT_CONFIDENCE,
          detectedBy: 'route-extractor',
          reason: `Both files reference route "${entryA.route.route}"`
        });
      }
    }
  }

  return connections;
}

/**
 * Verifica si dos archivos comparten rutas API
 * @param {Object} routesA - Rutas del archivo A
 * @param {Object} routesB - Rutas del archivo B
 * @returns {boolean}
 */
export function sharesRoutes(routesA, routesB) {
  const routeMapA = normalizeRouteSummary(routesA || {});
  const routeMapB = normalizeRouteSummary(routesB || {});

  if (!routeMapA.size || !routeMapB.size) return false;

  for (const normalized of routeMapB.keys()) {
    if (routeMapA.has(normalized)) return true;
  }

  return false;
}

/**
 * Obtiene las rutas compartidas entre dos archivos
 * @param {Object} routesA - Rutas del archivo A
 * @param {Object} routesB - Rutas del archivo B
 * @returns {string[]} - Rutas comunes (normalizadas)
 */
export function getSharedRoutes(routesA, routesB) {
  const routeMapA = normalizeRouteSummary(routesA || {});
  const routeMapB = normalizeRouteSummary(routesB || {});

  if (!routeMapA.size || !routeMapB.size) return [];

  const shared = [];
  for (const normalized of routeMapB.keys()) {
    if (routeMapA.has(normalized)) {
      shared.push(normalized);
    }
  }

  return shared;
}
