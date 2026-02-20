/**
 * @fileoverview pagination.js
 *
 * Sistema de paginación automática RECURSIVA para respuestas MCP.
 *
 * Se integra como middleware en el dispatcher central (mcp-setup-step.js)
 * y NO requiere modificaciones en cada tool individual.
 *
 * Comportamiento:
 * - Arrays TOP-LEVEL: paginados con `offset` + `limit` del caller
 * - Arrays ANIDADOS (dentro de objetos/items): capados a `limit` items, offset=0
 * - Reporta TODOS los arrays truncados en `_pagination.fields` con dot-path notation
 * - El AI puede navegar haciendo múltiples llamadas con offset incremental
 *
 * Estrategia de navegación para el AI:
 *   1. Primera llamada: overview (top-level con offset=0)
 *   2. Ver _pagination.fields para saber qué arrays tienen hasMore: true
 *   3. Llamada siguiente con offset mayor para top-level
 *   4. Para datos anidados que se truncaron, usar herramientas más específicas
 *      (get_function_details, get_call_graph, etc.) con el id/file del item
 *
 * @module mcp/core/pagination
 */

/** Límite por defecto cuando no se especifica limit */
const DEFAULT_LIMIT = 10;

/** Arrays más pequeños que esto no se paginan (no vale la pena) */
const MIN_ARRAY_TO_PAGINATE = 5;

/** Campos que NUNCA se paginan (son objetos de control, no listas de datos) */
const SKIP_FIELDS = new Set([
  '_pagination', 'summary', 'stats', 'metadata', 'recommendations',
  'note', 'error', 'overview', 'byFile', 'distribution', 'byType',
  'insights', 'topIssues', 'topRecommendations'
]);

/**
 * Extrae parámetros de paginación de los args del tool.
 */
export function extractPaginationParams(args = {}) {
  const offset = typeof args.offset === 'number' ? Math.max(0, args.offset) : 0;
  const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 500) : DEFAULT_LIMIT;
  const hasPagination = 'offset' in args || 'limit' in args;
  return { offset, limit, hasPagination };
}

/**
 * Pagina recursivamente un valor (array u objeto).
 *
 * @param {*} value - Valor a paginar
 * @param {number} limit - Límite de items por array
 * @param {number} topOffset - Offset solo para arrays top-level
 * @param {string} path - Dot-path actual (para reporting)
 * @param {object} report - Acumula info de arrays truncados
 * @param {boolean} isTopLevel - Si true, aplica topOffset; si false, offset=0
 */
function paginateValue(value, limit, topOffset, path, report, isTopLevel) {
  // Primitivos → sin cambios
  if (value === null || value === undefined || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    const useOffset = isTopLevel ? topOffset : 0;
    const total = value.length;
    const shouldPaginate = total > (isTopLevel ? MIN_ARRAY_TO_PAGINATE : limit);

    const page = shouldPaginate ? value.slice(useOffset, useOffset + limit) : value;

    if (shouldPaginate) {
      report[path] = {
        total,
        returned: page.length,
        offset: useOffset,
        limit,
        hasMore: useOffset + limit < total,
        nextOffset: useOffset + limit < total ? useOffset + limit : null
      };
    }

    // Recurrir dentro de cada item del array (los items ya no son "top-level")
    return page.map(item => paginateValue(item, limit, 0, path + '[]', report, false));
  }

  // Es un objeto → recurrir en sus propiedades
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (SKIP_FIELDS.has(key) || key === '_pagination') {
      result[key] = val;
      continue;
    }
    const childPath = path ? `${path}.${key}` : key;
    // Las propiedades de un objeto son "top-level" solo si el objeto padre es top-level
    // y la propiedad en sí es un array (no un objeto anidado)
    const childIsTopLevel = isTopLevel && !Array.isArray(val);
    result[key] = paginateValue(val, limit, topOffset, childPath, report, childIsTopLevel);
  }
  return result;
}

/**
 * Aplica paginación automática RECURSIVA al resultado de un tool.
 * Punto de entrada — llamado desde mcp-setup-step.js después de cada tool call.
 *
 * @param {object} result - Resultado original del tool
 * @param {object} args - Args originales (para leer offset/limit)
 * @returns {object} - Resultado con arrays paginados y _pagination agregado
 */
export function applyPagination(result, args = {}) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  if (result.error) return result;

  const { offset, limit } = extractPaginationParams(args);
  const report = {};

  // Recorremos las propiedades top-level manualmente para marcar correctamente
  // cuáles arrays son "top-level" (usan offset del caller) vs anidados (offset=0)
  const modified = {};
  for (const [key, value] of Object.entries(result)) {
    if (SKIP_FIELDS.has(key) || key === '_pagination') {
      modified[key] = value;
      continue;
    }
    // Arrays top-level usan offset del caller; objetos top-level se recorren recursivamente
    const isTopLevelArray = Array.isArray(value);
    modified[key] = paginateValue(value, limit, offset, key, report, isTopLevelArray);
  }

  if (Object.keys(report).length > 0) {
    modified._pagination = {
      offset,
      limit,
      fields: report,
      usage: [
        'Top-level arrays: use offset/limit to paginate (e.g. { offset: 20, limit: 20 }).',
        'Nested arrays (path contains "[]"): capped at limit, offset always 0.',
        'For more detail on a specific item, use targeted tools (get_function_details, get_call_graph, etc.).'
      ].join(' ')
    };
  }

  return modified;
}

/**
 * Schema fragment estándar para agregar a tools que devuelvan listas.
 */
export const PAGINATION_SCHEMA = {
  offset: {
    type: 'number',
    description: 'Skip first N items in top-level arrays (pagination). Default: 0',
    default: 0
  },
  limit: {
    type: 'number',
    description: 'Max items per array at any depth. Default: 10, max: 500',
    default: DEFAULT_LIMIT
  }
};
