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

/**
 * Detecta conexiones entre archivos basadas en rutas API compartidas
 * @param {Object} fileResults - Mapa de filePath -> {routes, ...}
 * @returns {Array} - Conexiones detectadas
 */
export function detectRouteConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);

  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const routesA = resultsA.routes || { all: [] };

    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const routesB = resultsB.routes || { all: [] };

      // Normalizar rutas (quitar params): /api/users/:id -> /api/users/:param
      const routeSetA = new Map();
      for (const r of routesA.all) {
        if (isValidRoute(r.route)) {
          const normalized = normalizeRoute(r.route);
          routeSetA.set(normalized, r);
        }
      }

      const commonRoutes = routesB.all.filter(r => {
        if (!isValidRoute(r.route)) return false;
        const normalized = normalizeRoute(r.route);
        return routeSetA.has(normalized);
      });

      for (const routeB of commonRoutes) {
        const normalized = normalizeRoute(routeB.route);
        const routeA = routeSetA.get(normalized);

        // Determinar dirección: server->client o ambos
        const isServerA = routeA.type === 'server';
        const isServerB = routeB.type === 'server';
        let direction;
        let sourceFile;
        let targetFile;

        if (isServerA && !isServerB) {
          direction = `${fileA} serves, ${fileB} consumes`;
          sourceFile = fileA;
          targetFile = fileB;
        } else if (!isServerA && isServerB) {
          direction = `${fileB} serves, ${fileA} consumes`;
          sourceFile = fileB;
          targetFile = fileA;
        } else {
          direction = 'both access';
          sourceFile = fileA;
          targetFile = fileB;
        }

        connections.push({
          id: `route-${sourceFile}-${targetFile}-${normalized}`,
          sourceFile,
          targetFile,
          type: ConnectionType.SHARED_ROUTE,
          via: 'route',
          route: routeB.route,
          normalizedRoute: normalized,
          direction,
          confidence: DEFAULT_CONFIDENCE,
          detectedBy: 'route-extractor',
          reason: `Both files reference route "${routeB.route}"`
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
  if (!routesA?.all?.length || !routesB?.all?.length) return false;

  const routeSetA = new Set(
    routesA.all
      .filter(r => isValidRoute(r.route))
      .map(r => normalizeRoute(r.route))
  );

  return routesB.all.some(r => {
    if (!isValidRoute(r.route)) return false;
    const normalized = normalizeRoute(r.route);
    return routeSetA.has(normalized);
  });
}

/**
 * Obtiene las rutas compartidas entre dos archivos
 * @param {Object} routesA - Rutas del archivo A
 * @param {Object} routesB - Rutas del archivo B
 * @returns {string[]} - Rutas comunes (normalizadas)
 */
export function getSharedRoutes(routesA, routesB) {
  if (!routesA?.all?.length || !routesB?.all?.length) return [];

  const routeSetA = new Set(
    routesA.all
      .filter(r => isValidRoute(r.route))
      .map(r => normalizeRoute(r.route))
  );

  return routesB.all
    .filter(r => isValidRoute(r.route))
    .map(r => normalizeRoute(r.route))
    .filter(normalized => routeSetA.has(normalized));
}
