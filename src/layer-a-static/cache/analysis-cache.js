/**
 * analysis-cache.js
 * Cache inteligente incremental para análisis estático
 * 
 * Estrategia:
 * - Cache por archivo (hash del contenido)
 * - Invalidación inteligente (solo archivos modificados)
 * - Persistencia en disco (.OmnySystemData/cache.json)
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CACHE_FILE = '.OmnySystemData/cache.json';
const CACHE_VERSION = '1.0.0';

/**
 * Genera hash MD5 del contenido
 * @param {string} content - Contenido a hashear
 * @returns {string} - Hash hexadecimal
 */
function generateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Cache de análisis estático
 */
export class AnalysisCache {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.cachePath = path.join(rootPath, CACHE_FILE);
    this.cache = {
      version: CACHE_VERSION,
      timestamp: null,
      files: {} // filePath -> { hash, analysis, timestamp }
    };
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Carga el cache desde disco
   */
  async load() {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      const loaded = JSON.parse(content);
      
      // Validar versión
      if (loaded.version === CACHE_VERSION) {
        this.cache = loaded;
        console.log(`  📦 Loaded cache: ${Object.keys(this.cache.files).length} files cached`);
      } else {
        console.log('  🔄 Cache version mismatch, starting fresh');
        this.cache.version = CACHE_VERSION;
      }
    } catch (error) {
      // No existe cache o está corrupto, empezar vacío
      console.log('  📦 No cache found, starting fresh');
    }
  }

  /**
   * Guarda el cache en disco
   */
  async save() {
    try {
      this.cache.timestamp = new Date().toISOString();
      await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
      await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.warn('  ⚠️  Failed to save cache:', error.message);
    }
  }

  /**
   * Obtiene análisis cacheado si es válido
   * @param {string} filePath - Ruta del archivo
   * @param {string} content - Contenido actual
   * @returns {object|null} - Análisis cacheado o null
   */
  get(filePath, content) {
    const hash = generateHash(content);
    const cached = this.cache.files[filePath];
    
    if (cached && cached.hash === hash) {
      this.hitCount++;
      return cached.analysis;
    }
    
    this.missCount++;
    return null;
  }

  /**
   * Guarda análisis en cache
   * @param {string} filePath - Ruta del archivo
   * @param {string} content - Contenido del archivo
   * @param {object} analysis - Resultado del análisis
   */
  set(filePath, content, analysis) {
    const hash = generateHash(content);
    this.cache.files[filePath] = {
      hash,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Invalida entradas de archivos que ya no existen
   * @param {string[]} existingFiles - Lista de archivos actuales
   */
  invalidateDeleted(existingFiles) {
    const existingSet = new Set(existingFiles);
    let deletedCount = 0;
    
    for (const filePath of Object.keys(this.cache.files)) {
      if (!existingSet.has(filePath)) {
        delete this.cache.files[filePath];
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`  🗑️  Invalidated ${deletedCount} deleted files from cache`);
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(1) : 0;
    
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      cachedFiles: Object.keys(this.cache.files).length
    };
  }

  /**
   * Limpia el cache completamente
   */
  async clear() {
    this.cache.files = {};
    this.hitCount = 0;
    this.missCount = 0;
    
    try {
      await fs.unlink(this.cachePath);
    } catch (error) {
      // No existe, ignorar
    }
  }

  /**
   * Limpia entradas antiguas (más de X días)
   * @param {number} maxAgeDays - Edad máxima en días
   */
  async cleanOld(maxAgeDays = 30) {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // ms
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [filePath, entry] of Object.entries(this.cache.files)) {
      const entryAge = now - new Date(entry.timestamp).getTime();
      if (entryAge > maxAge) {
        delete this.cache.files[filePath];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`  🧹 Cleaned ${cleanedCount} old entries from cache`);
      await this.save();
    }
  }
}

/**
 * Función helper para usar cache en análisis
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {Function} analyzeFn - Función de análisis
 * @param {object} options - Opciones
 * @returns {object} - Resultados con cache
 */
export async function analyzeWithCache(rootPath, analyzeFn, options = {}) {
  const { 
    files, // Mapa de filePath -> content
    useCache = true,
    verbose = true
  } = options;
  
  const cache = new AnalysisCache(rootPath);
  
  if (useCache) {
    await cache.load();
    cache.invalidateDeleted(Object.keys(files));
  }
  
  const results = {};
  const filesToAnalyze = [];
  
  // Separar archivos cacheados de los que necesitan análisis
  for (const [filePath, content] of Object.entries(files)) {
    if (useCache) {
      const cached = cache.get(filePath, content);
      if (cached) {
        results[filePath] = cached;
        continue;
      }
    }
    filesToAnalyze.push({ filePath, content });
  }
  
  if (verbose && useCache) {
    const stats = cache.getStats();
    console.log(`  📊 Cache: ${stats.hitCount} hits, ${stats.missCount} misses (${stats.hitRate})`);
  }
  
  // Analizar archivos no cacheados
  for (const { filePath, content } of filesToAnalyze) {
    const analysis = await analyzeFn(filePath, content);
    results[filePath] = analysis;
    
    if (useCache) {
      cache.set(filePath, content, analysis);
    }
  }
  
  if (useCache) {
    await cache.save();
  }
  
  return results;
}

/**
 * Invalida cache completo para un proyecto
 * @param {string} rootPath - Ruta raíz
 */
export async function invalidateCache(rootPath) {
  const cache = new AnalysisCache(rootPath);
  await cache.clear();
  console.log('  🗑️  Cache invalidated');
}
