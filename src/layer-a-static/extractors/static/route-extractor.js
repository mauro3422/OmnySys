/**
 * @fileoverview route-extractor.js
 *
 * Extrae rutas API del código (server-side y client-side)
 * Detecta: app.get("/api/users"), fetch("/api/users"), axios.post("/api/auth")
 *
 * @module extractors/static/route-extractor
 */

/**
 * Patrones regex para detectar rutas API
 * @constant {Object}
 */
const ROUTE_PATTERNS = {
  // Express/Koa/Fastify server routes
  serverRoutes: [
    /\.(get|post|put|patch|delete|all|use)\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
    /router\.(get|post|put|patch|delete|all)\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
  ],
  // Fetch/axios client calls
  clientCalls: [
    /fetch\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
    /fetch\s*\(\s*`([^`]*\/api\/[^`]*?)`/g,
    /axios\.(get|post|put|patch|delete)\s*\(\s*['"`](\/[^'"`]*?)['"`]/g,
    /\.request\s*\(\s*\{[^}]*url\s*:\s*['"`](\/[^'"`]*?)['"`]/g,
  ]
};

/**
 * Extrae rutas API de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - {server: [], client: [], all: []}
 */
export function extractRoutes(filePath, code) {
  const routes = { server: [], client: [], all: [] };

  // Extraer rutas de servidor
  for (const pattern of ROUTE_PATTERNS.serverRoutes) {
    // Reset lastIndex para cada archivo
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const method = match[1].toUpperCase();
      const route = match[2];
      const line = code.substring(0, match.index).split('\n').length;
      routes.server.push({ method, route, line, type: 'server' });
      routes.all.push({ route, line, type: 'server', method });
    }
  }

  // Extraer rutas de cliente
  for (const pattern of ROUTE_PATTERNS.clientCalls) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const route = match[2] || match[1]; // Depende del grupo de captura
      const line = code.substring(0, match.index).split('\n').length;
      routes.client.push({ route, line, type: 'client' });
      routes.all.push({ route, line, type: 'client' });
    }
  }

  return routes;
}

/**
 * Normaliza una ruta para comparación (quita params dinámicos)
 * /api/users/:id -> /api/users/:param
 * /api/users/${id} -> /api/users/${param}
 * @param {string} route - Ruta a normalizar
 * @returns {string} - Ruta normalizada
 */
export function normalizeRoute(route) {
  return route
    .replace(/:[^/]+/g, ':param')
    .replace(/\$\{[^}]+\}/g, '${param}');
}

/**
 * Verifica si una ruta es una ruta API válida
 * @param {string} route - Ruta a verificar
 * @returns {boolean}
 */
export function isValidRoute(route) {
  return route &&
    typeof route === 'string' &&
    route.startsWith('/') &&
    route.length > 1;
}
