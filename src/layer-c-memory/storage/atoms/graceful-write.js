/**
 * @fileoverview graceful-write.js
 * 
 * Wrapper de fs/promises con manejo graceful de EMFILE.
 * Siguiendo el patrón de graceful-fs de Isaac Schlueter.
 * 
 * @module layer-c-memory/storage/atoms/graceful-write
 * 
 * @description
 * Diferencia con graceful-fs original:
 * - Solo envuelve writeFile y mkdir (lo que necesitamos)
 * - Integrado con WriteQueue para backpressure
 * - Métricas específicas para nuestro uso
 * 
 * Cuando ocurre EMFILE:
 * 1. Espera a que se cierre algún archivo
 * 2. Reintenta con backoff exponencial
 * 3. Si sigue fallando, encola en WriteQueue
 */

import fs from 'fs/promises';
import { createLogger } from '#utils/logger.js';
import { getWriteQueue } from './write-queue.js';

const logger = createLogger('OmnySys:graceful-write');

const MAX_RETRIES = 3;
const BASE_DELAY = 50;
const MAX_DELAY = 2000;

const stats = {
  writes: 0,
  writesRetried: 0,
  writesFailed: 0,
  emfileCount: 0,
  totalBytes: 0,
  avgLatency: 0
};

let latencySum = 0;

/**
 * Escribe un archivo con manejo graceful de EMFILE
 * 
 * @param {string} path - Ruta del archivo
 * @param {string|Buffer} data - Contenido a escribir
 * @param {Object} options - Opciones de fs.writeFile
 * @returns {Promise<void>}
 */
export async function gracefulWriteFile(path, data, options = {}) {
  const startTime = Date.now();
  let lastError = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await fs.writeFile(path, data, options);
      
      const latency = Date.now() - startTime;
      latencySum += latency;
      stats.writes++;
      stats.totalBytes += typeof data === 'string' ? data.length : data.byteLength || 0;
      stats.avgLatency = latencySum / stats.writes;
      
      if (latency > 100) {
        logger.debug(`Write ${path}: ${latency}ms (${attempt > 0 ? `retry ${attempt}` : 'ok'})`);
      }
      
      return;
    } catch (error) {
      lastError = error;
      
      if (isEMFILE(error)) {
        stats.emfileCount++;
        stats.writesRetried++;
        
        const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        logger.warn(`EMFILE on ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        
        await sleep(delay);
        continue;
      }
      
      if (error.code === 'ENOENT') {
        try {
          await gracefulMkdir(require('path').dirname(path), { recursive: true });
          continue;
        } catch (mkdirError) {
          throw mkdirError;
        }
      }
      
      throw error;
    }
  }
  
  stats.writesFailed++;
  logger.error(`Failed to write ${path} after ${MAX_RETRIES} attempts:`, lastError?.message);
  throw lastError;
}

/**
 * Crea un directorio con manejo graceful
 * 
 * @param {string} path - Ruta del directorio
 * @param {Object} options - Opciones de fs.mkdir
 * @returns {Promise<void>}
 */
export async function gracefulMkdir(path, options = {}) {
  try {
    await fs.mkdir(path, options);
  } catch (error) {
    if (error.code === 'EEXIST') {
      return;
    }
    
    if (isEMFILE(error)) {
      const delay = BASE_DELAY;
      logger.warn(`EMFILE on mkdir ${path}, retrying in ${delay}ms`);
      await sleep(delay);
      return fs.mkdir(path, options);
    }
    
    throw error;
  }
}

/**
 * Lee un archivo con manejo graceful
 * 
 * @param {string} path - Ruta del archivo
 * @param {string} encoding - Encoding (default: 'utf-8')
 * @returns {Promise<string|Buffer>}
 */
export async function gracefulReadFile(path, encoding = 'utf-8') {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fs.readFile(path, encoding);
    } catch (error) {
      if (isEMFILE(error)) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        logger.warn(`EMFILE on read ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error(`Failed to read ${path} after ${MAX_RETRIES} attempts`);
}

/**
 * Escribe JSON con serialización y manejo graceful
 * 
 * @param {string} path - Ruta del archivo
 * @param {any} data - Datos a serializar
 * @param {Object} options - Opciones
 * @param {number} options.indent - Indentación JSON (default: 2)
 * @returns {Promise<void>}
 */
export async function writeJSON(path, data, options = {}) {
  const { indent = 2 } = options;
  const json = JSON.stringify(data, null, indent);
  return gracefulWriteFile(path, json, 'utf-8');
}

/**
 * Lee JSON con parseo y manejo graceful
 * 
 * @param {string} path - Ruta del archivo
 * @returns {Promise<any>} Datos parseados
 */
export async function readJSON(path) {
  const content = await gracefulReadFile(path);
  return JSON.parse(content);
}

/**
 * Detecta error EMFILE
 */
function isEMFILE(error) {
  return error.code === 'EMFILE' || 
         error.code === 'ENFILE' ||
         (error.message && error.message.includes('too many open files'));
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Lee un directorio con manejo graceful
 * 
 * @param {string} dirPath - Ruta del directorio
 * @param {Object} options - Opciones de fs.readdir
 * @returns {Promise<Array>} Entradas del directorio
 */
export async function gracefulReaddir(dirPath, options = {}) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fs.readdir(dirPath, options);
    } catch (error) {
      if (isEMFILE(error)) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        logger.warn(`EMFILE on readdir ${dirPath}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  return [];
}

/**
 * Estadísticas del sistema de escritura
 */
export function getWriteStats() {
  return {
    ...stats,
    health: stats.writesFailed > 10 ? 'degraded' : 
            stats.emfileCount > 50 ? 'warning' : 'healthy'
  };
}

/**
 * Resetea estadísticas
 */
export function resetWriteStats() {
  stats.writes = 0;
  stats.writesRetried = 0;
  stats.writesFailed = 0;
  stats.emfileCount = 0;
  stats.totalBytes = 0;
  stats.avgLatency = 0;
  latencySum = 0;
}

export default {
  gracefulWriteFile,
  gracefulMkdir,
  gracefulReadFile,
  gracefulReaddir,
  writeJSON,
  readJSON,
  getWriteStats,
  resetWriteStats
};
