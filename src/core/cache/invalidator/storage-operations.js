/**
 * @fileoverview storage-operations.js
 * 
 * Operaciones de almacenamiento para el caché
 * SRP: Solo maneja I/O con el caché (RAM y disco)
 * 
 * @module cache-invalidator/storage-operations
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:cache:storage');

/**
 * Operaciones de almacenamiento en RAM
 */
export class RamStorageOperations {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }

  /**
   * Invalida una entrada del caché RAM
   * @param {string} key - Clave a invalidar
   * @returns {boolean} - true si se eliminó
   */
  invalidateEntry(key) {
    if (typeof this.cache?.invalidate === 'function') {
      const deleted = this.cache.invalidate(key);
      if (deleted) {
        logger.debug(`🗑️  Invalidated RAM entry: ${key}`);
      }
      return deleted;
    }

    if (!this.cache?.ramCache) {
      return false;
    }

    // Fallback for legacy in-memory cache managers.
    if (typeof key === 'string' && (key.includes('*') || key.includes('?'))) {
      const pattern = key.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = new RegExp(pattern);
      let count = 0;

      for (const k of this.cache.ramCache.keys()) {
        if (regex.test(k)) {
          this.cache.ramCache.delete(k);
          count++;
        }
      }

      if (count > 0) {
        logger.debug(`🗑️  Invalidated ${count} RAM entries matching ${key}`);
      }
      return count > 0;
    }

    const deleted = this.cache.ramCache.delete(key);
    if (deleted) {
      logger.debug(`🗑️  Invalidated RAM entry: ${key}`);
    }
    return deleted;
  }

  /**
   * Guarda snapshot del estado actual para rollback
   * @param {string} key - Clave a guardar
   * @returns {object|null} - Snapshot o null
   */
  captureSnapshot(key) {
    if (typeof this.cache?.get !== 'function' && !this.cache?.ramCache) {
      return null;
    }

    const item = typeof this.cache?.get === 'function'
      ? this.cache.get(key)
      : this.cache.ramCache.get(key)?.data;

    if (!item) {
      return { existed: false, key };
    }

    return {
      existed: true,
      key,
      data: JSON.parse(JSON.stringify(item))
    };
  }

  /**
   * Restaura desde snapshot (rollback)
   * @param {object} snapshot - Snapshot a restaurar
   */
  restoreSnapshot(snapshot) {
    if (snapshot.existed) {
      if (typeof this.cache?.set === 'function') {
        this.cache.set(snapshot.key, snapshot.data);
      } else {
        if (!this.cache.ramCache) {
          this.cache.ramCache = new Map();
        }
        this.cache.ramCache.set(snapshot.key, {
          data: snapshot.data,
          expiry: null,
          createdAt: Date.now()
        });
      }
      logger.debug(`↩️  Restored RAM entry from snapshot: ${snapshot.key}`);
    }
  }
}

/**
 * Operaciones de almacenamiento en disco
 */
export class DiskStorageOperations {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.filesDir = path.join(projectPath, '.omnysysdata', 'files');
  }

  /**
   * Elimina archivo de caché del disco
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - true si se eliminó
   */
  async deleteFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileDataPath = path.join(this.filesDir, normalizedPath + '.json');

    try {
      await fs.unlink(fileDataPath);
      logger.debug(`🗑️  Deleted disk cache file: ${normalizedPath}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Archivo no existía, no es error
        logger.debug(`ℹ️  Disk cache file didn't exist: ${normalizedPath}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Crea backup del archivo antes de eliminar
   * @param {string} filePath - Ruta del archivo
   * @returns {object} - Backup info
   */
  async createBackup(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileDataPath = path.join(this.filesDir, normalizedPath + '.json');
    const backupPath = fileDataPath + '.backup';

    try {
      const content = await fs.readFile(fileDataPath, 'utf-8');
      await fs.writeFile(backupPath, content);
      
      return {
        existed: true,
        filePath: normalizedPath,
        backupPath,
        content
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { existed: false, filePath: normalizedPath };
      }
      throw error;
    }
  }

  /**
   * Restaura desde backup (rollback)
   * @param {object} backup - Backup a restaurar
   */
  async restoreFromBackup(backup) {
    if (!backup.existed) {
      return;
    }

    const fileDataPath = path.join(this.filesDir, backup.filePath + '.json');
    await fs.writeFile(fileDataPath, backup.content);
    
    // Limpiar backup
    try {
      await fs.unlink(backup.backupPath);
    } catch {
      // Ignorar error al limpiar backup
    }
    
    logger.debug(`↩️  Restored disk file from backup: ${backup.filePath}`);
  }

  /**
   * Limpia backups antiguos
   */
  async cleanupBackups() {
    try {
      const files = await fs.readdir(this.filesDir, { recursive: true });
      const backups = files.filter(f => f.endsWith('.backup'));
      
      for (const backup of backups) {
        await fs.unlink(path.join(this.filesDir, backup));
      }
      
      if (backups.length > 0) {
        logger.info(`🧹 Cleaned up ${backups.length} old backup files`);
      }
    } catch (error) {
      logger.warn('⚠️  Failed to cleanup backups:', error.message);
    }
  }
}

/**
 * Operaciones con el índice del caché
 */
export class IndexOperations {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }

  /**
   * Elimina entrada del índice
   * @param {string} filePath - Ruta del archivo
   * @returns {object} - Entrada eliminada o null
   */
  removeEntry(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Safety check: ensure index and entries exist
    if (!this.cache?.index?.entries) {
      logger.warn(`⚠️  Cannot remove entry: index not initialized`);
      return null;
    }
    
    const entry = this.cache.index.entries[normalizedPath];
    
    if (entry) {
      delete this.cache.index.entries[normalizedPath];
      if (this.cache.index.metadata) {
        this.cache.index.metadata.totalFiles--;
      }
      logger.debug(`🗑️  Removed index entry: ${normalizedPath}`);
    }
    
    return entry || null;
  }

  /**
   * Restaura entrada en el índice (rollback)
   * @param {string} filePath - Ruta del archivo
   * @param {object} entry - Entrada a restaurar
   */
  restoreEntry(filePath, entry) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Safety check: ensure index and entries exist
    if (!this.cache?.index) {
      this.cache.index = { entries: {}, metadata: { totalFiles: 0 } };
    }
    if (!this.cache.index.entries) {
      this.cache.index.entries = {};
    }
    if (!this.cache.index.metadata) {
      this.cache.index.metadata = { totalFiles: 0 };
    }
    
    this.cache.index.entries[normalizedPath] = entry;
    this.cache.index.metadata.totalFiles++;
    logger.debug(`↩️  Restored index entry: ${normalizedPath}`);
  }

  /**
   * Guarda índice en disco
   * @deprecated - Ya no se usa, SQLite es la fuente de datos
   */
  async saveIndex() {
    return;
  }
}
