/**
 * @fileoverview disk-storage-operations.js
 *
 * Operaciones de almacenamiento para el caché en disco.
 *
 * @module cache-invalidator/storage-operations/disk-storage-operations
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { normalizeCachePath } from './shared.js';

const logger = createLogger('OmnySys:cache:storage');

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
    const normalizedPath = normalizeCachePath(filePath);
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
    const normalizedPath = normalizeCachePath(filePath);
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
