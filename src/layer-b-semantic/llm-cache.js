/**
 * llm-cache.js
 * Sistema de caché para resultados de análisis LLM
 *
 * Estrategia:
 * - Cache key = hash del código + versión del prompt
 * - Invalidación: solo si el código cambia
 * - Almacenamiento: .OmnySystemData/llm-cache/
 * - TTL: indefinido (se invalida por cambio de contenido)
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Gestor de caché para resultados LLM
 */
export class LLMCache {
  constructor(cacheDir = '.OmnySystemData/llm-cache', maxEntries = 500) {
    this.cacheDir = cacheDir;
    this.enabled = true;
    this.maxEntries = maxEntries; // Límite máximo de archivos en caché
  }

  /**
   * Inicializa el directorio de caché
   */
  async initialize() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      return true;
    } catch (error) {
      console.warn('⚠️  Failed to create LLM cache directory:', error.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Genera una cache key única basada en código + prompt
   * @param {string} filePath - Ruta del archivo
   * @param {string} code - Código fuente
   * @param {string} promptTemplate - Template del prompt usado
   * @returns {string} - Hash único
   */
  generateCacheKey(filePath, code, promptTemplate) {
    // Incluir filePath + código + versión del prompt
    const content = `${filePath}:${code}:${promptTemplate}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Obtiene el path del archivo de caché
   * @private
   */
  getCachePath(cacheKey) {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  /**
   * Verifica si existe un resultado en caché
   * @param {string} filePath - Ruta del archivo
   * @param {string} code - Código fuente
   * @param {string} promptTemplate - Template del prompt
   * @returns {Promise<object|null>} - Resultado cacheado o null
   */
  async get(filePath, code, promptTemplate) {
    if (!this.enabled) return null;

    try {
      const cacheKey = this.generateCacheKey(filePath, code, promptTemplate);
      const cachePath = this.getCachePath(cacheKey);

      // Verificar si existe
      try {
        await fs.access(cachePath);
      } catch {
        return null; // No existe en caché
      }

      // Leer y parsear
      const content = await fs.readFile(cachePath, 'utf-8');
      const cached = JSON.parse(content);

      // Validar estructura
      if (!cached.result || !cached.timestamp) {
        console.warn(`⚠️  Invalid cache entry for ${filePath}, ignoring`);
        return null;
      }

      // Retornar resultado
      return cached.result;
    } catch (error) {
      console.warn(`⚠️  Cache read error for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Limpia entradas antiguas si se excede el límite (rotación FIFO)
   * @private
   */
  async rotateCacheIfNeeded() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      if (jsonFiles.length < this.maxEntries) {
        return; // No necesita rotación
      }
      
      // Ordenar por mtime (más antiguo primero)
      const filesWithStats = await Promise.all(
        jsonFiles.map(async (f) => {
          const stat = await fs.stat(path.join(this.cacheDir, f));
          return { file: f, mtime: stat.mtime };
        })
      );
      
      filesWithStats.sort((a, b) => a.mtime - b.mtime);
      
      // Eliminar los más antiguos hasta dejar espacio (mantener 80% del límite)
      const targetSize = Math.floor(this.maxEntries * 0.8);
      const toDelete = filesWithStats.slice(0, filesWithStats.length - targetSize);
      
      for (const { file } of toDelete) {
        await fs.unlink(path.join(this.cacheDir, file));
      }
      
      if (toDelete.length > 0) {
        console.log(`🔄 LLM cache rotated: removed ${toDelete.length} old entries`);
      }
    } catch (error) {
      // Ignorar errores de rotación
    }
  }

  /**
   * Guarda un resultado en caché
   * @param {string} filePath - Ruta del archivo
   * @param {string} code - Código fuente
   * @param {string} promptTemplate - Template del prompt
   * @param {object} result - Resultado del análisis LLM
   * @returns {Promise<boolean>} - true si se guardó correctamente
   */
  async set(filePath, code, promptTemplate, result) {
    if (!this.enabled) return false;

    try {
      // Rotación: limpiar entradas antiguas si es necesario
      await this.rotateCacheIfNeeded();
      
      const cacheKey = this.generateCacheKey(filePath, code, promptTemplate);
      const cachePath = this.getCachePath(cacheKey);

      const cacheEntry = {
        filePath,
        cacheKey,
        timestamp: Date.now(),
        result
      };

      await fs.writeFile(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.warn(`⚠️  Cache write error for ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Limpia toda la caché
   * @returns {Promise<number>} - Número de archivos eliminados
   */
  async clear() {
    if (!this.enabled) return 0;

    try {
      const files = await fs.readdir(this.cacheDir);
      let count = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
          count++;
        }
      }

      return count;
    } catch (error) {
      console.warn('⚠️  Cache clear error:', error.message);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de la caché
   * @returns {Promise<object>} - Estadísticas
   */
  async getStats() {
    if (!this.enabled) {
      return { enabled: false, entries: 0, totalSize: 0 };
    }

    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      let totalSize = 0;
      for (const file of jsonFiles) {
        const stat = await fs.stat(path.join(this.cacheDir, file));
        totalSize += stat.size;
      }

      return {
        enabled: true,
        entries: jsonFiles.length,
        maxEntries: this.maxEntries,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        cacheDir: this.cacheDir
      };
    } catch (error) {
      return { enabled: false, error: error.message };
    }
  }
}

/**
 * Instancia global de caché (singleton)
 */
let globalCache = null;

/**
 * Obtiene la instancia global de caché
 * @returns {Promise<LLMCache>}
 */
export async function getLLMCache() {
  if (!globalCache) {
    globalCache = new LLMCache();
    await globalCache.initialize();
  }
  return globalCache;
}
