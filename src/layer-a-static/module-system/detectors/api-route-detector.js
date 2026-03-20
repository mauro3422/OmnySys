/**
 * @fileoverview API Route Detector
 * 
 * Detecta entry points de tipo API (routes, handlers HTTP)
 * 
 * @module module-system/detectors/api-route-detector
 * @phase 3
 */

import path from 'path';
import { findMolecule, camelToKebab } from '../utils.js';

const ROUTE_FILE_PATTERN = /(?:^|[\\/])(?:routes|router|api|server|app)\.js|(?:^|[\\/])(?:routes|api)[\\/]/i;

/**
 * Busca archivos que contienen rutas API
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Rutas API encontradas
 */
export function findAPIRoutes(modules) {
  const routes = [];

  for (const module of modules) {
    for (const file of module.files || []) {
      if (!ROUTE_FILE_PATTERN.test(file.path)) {
        continue;
      }

      const molecule = findMolecule(file.path, modules);
      if (!molecule) {
        continue;
      }

      const moduleName = module.moduleName;
      const fileName = path.basename(file.path);

      // Buscar patrones de rutas en el código
      for (const atom of molecule.atoms || []) {
        if (!atom.isExported) {
          continue;
        }

        // Heurística: si está en archivo de routes, probablemente es handler
        const routePath = inferRoutePath(atom.name, file.path);
        if (!routePath) {
          continue;
        }

        routes.push({
          type: 'api',
          method: inferHTTPMethod(atom.name, file.path),
          path: routePath,
          handler: {
            module: moduleName,
            file: fileName,
            function: atom.name
          },
          middleware: findMiddleware(atom, molecule)
        });
      }
    }
  }

  return routes;
}

/**
 * Infiere path de ruta desde nombre de función
 * @param {string} functionName - Nombre de función
 * @param {string} filePath - Ruta del archivo
 * @returns {string|null} - Path inferido
 */
function inferRoutePath(functionName, filePath) {
  // Patrones comunes
  const patterns = [
    { regex: /^get(.+)$/, transform: m => `/${camelToKebab(m[1])}` },
    { regex: /^create(.+)$/, transform: m => `/${camelToKebab(m[1])}` },
    { regex: /^update(.+)$/, transform: m => `/${camelToKebab(m[1])}/:id` },
    { regex: /^delete(.+)$/, transform: m => `/${camelToKebab(m[1])}/:id` },
    { regex: /^handle(.+)$/, transform: m => `/${camelToKebab(m[1])}` }
  ];
  
  for (const { regex, transform } of patterns) {
    const match = functionName.match(regex);
    if (match) {
      return transform(match);
    }
  }
  
  // Default: usar nombre del archivo
  const fileName = path.basename(filePath, '.js');
  if (fileName === 'routes' || fileName === 'api') {
    return `/${camelToKebab(functionName)}`;
  }
  
  return `/${camelToKebab(fileName)}/${camelToKebab(functionName)}`;
}

/**
 * Infiere método HTTP desde nombre de función
 * @param {string} functionName - Nombre de función
 * @param {string} filePath - Ruta del archivo
 * @returns {string} - Método HTTP
 */
function inferHTTPMethod(functionName, filePath) {
  if (/^get|^find|^list|^search/i.test(functionName)) return 'GET';
  if (/^create|^add|^post/i.test(functionName)) return 'POST';
  if (/^update|^put|^patch/i.test(functionName)) return 'PUT';
  if (/^delete|^remove|^destroy/i.test(functionName)) return 'DELETE';
  if (/^handlePost/i.test(functionName)) return 'POST';
  if (/^handleGet/i.test(functionName)) return 'GET';
  
  return 'GET';
}

/**
 * Encuentra middleware usado por un handler
 * @param {Object} atom - Átomo (función)
 * @param {Object} molecule - Molécula (archivo)
 * @returns {Array} - Middleware encontrado
 */
function findMiddleware(atom, molecule) {
  const middleware = [];
  
  // Buscar en calls del átomo
  for (const call of atom.calls || []) {
    if (call.name.toLowerCase().includes('middleware') ||
        call.name.toLowerCase().includes('auth') ||
        call.name.toLowerCase().includes('validate')) {
      middleware.push({
        name: call.name,
        type: 'auth'
      });
    }
  }
  
  return middleware;
}
