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
 * Pre-calcula posiciones de saltos de línea para búsqueda binaria O(log N)
 */
function computeNewlinePositions(code) {
  const positions = [];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') positions.push(i);
  }
  return positions;
}

/**
 * Búsqueda binaria para encontrar número de línea basado en el índice
 */
function getLineNumber(index, nlPositions) {
  let low = 0, high = nlPositions.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (nlPositions[mid] < index) low = mid + 1;
    else high = mid - 1;
  }
  return low + 1;
}

/**
 * Extrae rutas basado en un set de patrones
 */
function extractFromPatterns(code, patterns, nlPositions, type) {
  const extracted = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      let route, method = null;

      if (type === 'server') {
        method = match[1].toUpperCase();
        route = match[2];
      } else {
        route = match[2] || match[1];
      }

      const line = getLineNumber(match.index, nlPositions);
      const entry = { route, line, type };
      if (method) entry.method = method;

      extracted.push(entry);
    }
  }
  return extracted;
}

/**
 * Extrae rutas API de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - {server: [], client: [], all: []}
 */
export function extractRoutes(filePath, code) {
  const nlPositions = computeNewlinePositions(code);

  const serverRoutes = extractFromPatterns(code, ROUTE_PATTERNS.serverRoutes, nlPositions, 'server');
  const clientRoutes = extractFromPatterns(code, ROUTE_PATTERNS.clientCalls, nlPositions, 'client');

  return {
    server: serverRoutes,
    client: clientRoutes,
    all: [...serverRoutes, ...clientRoutes]
  };
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

