/**
 * @fileoverview singleton.js
 *
 * Singleton factory para UnifiedCacheManager.
 *
 * PROBLEMA RESUELTO:
 *   Antes, cada `new UnifiedCacheManager(path) + initialize()` relía
 *   TODOS los archivos de .omnysysdata/files/ desde disco (2045 archivos).
 *   Con 213 jobs LLM esto causaba 435.585 lecturas + OOM.
 *
 * SOLUCIÓN:
 *   Map a nivel de módulo ESM. Node.js garantiza que el estado de módulo
 *   persiste entre imports, haciendo de esto un verdadero singleton por proceso.
 *   Primera llamada: crea e inicializa (caro, O(n archivos)).
 *   Llamadas siguientes: retorna instancia cacheada (O(1)).
 *
 * USO:
 *   import { getCacheManager } from '#core/cache/singleton.js';
 *   const cache = await getCacheManager(projectPath);
 *
 * @module core/cache/singleton
 */

import path from 'path';
import { UnifiedCacheManager } from './manager/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:cache:singleton');

/** @type {Map<string, UnifiedCacheManager>} Instancias inicializadas por projectPath */
const _instances = new Map();

/**
 * Promesas de inicialización en vuelo, para evitar race conditions cuando
 * dos callers piden la misma instancia antes de que termine el initialize().
 * @type {Map<string, Promise<UnifiedCacheManager>>}
 */
const _initPromises = new Map();

/**
 * Obtiene (o crea) la instancia singleton de UnifiedCacheManager para un proyecto.
 *
 * - Primera llamada: instancia + initialize() (lee .omnysysdata/files/)
 * - Llamadas concurrentes durante init: esperan la misma Promise (no duplican trabajo)
 * - Llamadas posteriores: retorna instancia del Map (O(1), sin I/O)
 *
 * @param {string} projectPath - Ruta raíz del proyecto (absoluta o relativa)
 * @param {object} [options] - Opciones pasadas a UnifiedCacheManager
 * @param {boolean} [options.enableChangeDetection=true]
 * @param {boolean} [options.cascadeInvalidation=true]
 * @returns {Promise<UnifiedCacheManager>}
 */
export async function getCacheManager(projectPath, options = {}) {
  const key = path.resolve(projectPath);

  // Fast path: instancia ya inicializada
  if (_instances.has(key)) {
    return _instances.get(key);
  }

  // Concurrent init: si ya hay una Promise en vuelo, esperar esa misma
  if (_initPromises.has(key)) {
    return _initPromises.get(key);
  }

  // Cold path: crear e inicializar
  const initPromise = (async () => {
    logger.info(`🏗️  Initializing cache singleton for: ${key}`);
    const instance = new UnifiedCacheManager(key, {
      enableChangeDetection: true,
      cascadeInvalidation: true,
      ...options
    });
    await instance.initialize();
    _instances.set(key, instance);
    _initPromises.delete(key);
    logger.info(`✅ Cache singleton ready for: ${key}`);
    return instance;
  })();

  _initPromises.set(key, initPromise);
  return initPromise;
}

/**
 * Invalida (elimina del Map) la instancia cacheada para un proyecto.
 *
 * Debe llamarse cuando el cache se limpia explícitamente (ej: error-guardian),
 * para que la próxima llamada a getCacheManager() obtenga una instancia fresca.
 *
 * @param {string} projectPath - Ruta raíz del proyecto
 */
export function invalidateCacheInstance(projectPath) {
  const key = path.resolve(projectPath);
  if (_instances.has(key)) {
    _instances.delete(key);
    logger.info(`🗑️  Cache singleton invalidated for: ${key}`);
  }
}

/**
 * Retorna el número de instancias vivas (útil para tests y diagnóstico).
 * @returns {number}
 */
export function getCacheInstanceCount() {
  return _instances.size;
}

/**
 * Retorna los projectPaths de todas las instancias vivas (útil para diagnóstico).
 * @returns {string[]}
 */
export function getCacheInstanceKeys() {
  return [..._instances.keys()];
}

export default getCacheManager;
