/**
 * @fileoverview backup-manager.js
 *
 * Gestiona backups automáticos para safe_edit.
 * Crea, restaura y limpia backups de archivos.
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:MCP:BackupManager');

const BACKUP_DIR = '.omny-backups';
const MAX_BACKUPS_PER_FILE = 5;
const BACKUP_EXPIRY_HOURS = 24;

/**
 * Crea backup de un archivo
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<string>} Ruta del backup creado
 */
export async function createBackup(filePath, projectPath) {
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const backupDir = path.join(projectPath, BACKUP_DIR);
  const timestamp = Date.now();
  const safeFileName = normalizedFilePath.replace(/\//g, '_').replace(/\\/g, '_');
  const backupFileName = `${safeFileName}.${timestamp}.bak`;
  const backupPath = path.join(backupDir, backupFileName);

  try {
    // Crear directorio de backups si no existe
    await fs.mkdir(backupDir, { recursive: true });

    // Leer archivo original
    const originalPath = path.join(projectPath, filePath);
    const content = await fs.readFile(originalPath, 'utf8');

    // Escribir backup
    await fs.writeFile(backupPath, content, 'utf8');

    logger.debug(`[BackupManager] Created backup: ${backupPath}`);

    return backupPath;
  } catch (error) {
    logger.error(`[BackupManager] Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Restaura archivo desde backup
 * @param {string} filePath - Ruta relativa del archivo a restaurar
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} backupPath - Ruta del backup a usar
 */
export async function restoreBackup(filePath, projectPath, backupPath) {
  try {
    const originalPath = path.join(projectPath, filePath);
    const content = await fs.readFile(backupPath, 'utf8');
    await fs.writeFile(originalPath, content, 'utf8');

    logger.info(`[BackupManager] Restored from backup: ${backupPath}`);
  } catch (error) {
    logger.error(`[BackupManager] Failed to restore backup: ${error.message}`);
    throw error;
  }
}

/**
 * Limpia backups viejos de un archivo específico
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 */
export async function cleanupOldBackups(projectPath, filePath) {
  const backupDir = path.join(projectPath, BACKUP_DIR);
  const safeFileName = filePath.replace(/\//g, '_').replace(/\\/g, '_');
  const pattern = `${safeFileName}.*.bak`;

  try {
    const files = await fs.readdir(backupDir);
    const matchingBackups = files
      .filter(f => f.startsWith(safeFileName) && f.endsWith('.bak'))
      .sort()
      .reverse();  // Más reciente primero

    // Mantener solo los últimos MAX_BACKUPS_PER_FILE
    const toDelete = matchingBackups.slice(MAX_BACKUPS_PER_FILE);

    for (const backupFile of toDelete) {
      const backupPath = path.join(backupDir, backupFile);
      await fs.unlink(backupPath);
      logger.debug(`[BackupManager] Deleted old backup: ${backupPath}`);
    }

    // Limpiar backups expirados por tiempo
    const now = Date.now();
    const expiryMs = BACKUP_EXPIRY_HOURS * 60 * 60 * 1000;

    for (const backupFile of matchingBackups) {
      const backupPath = path.join(backupDir, backupFile);
      const stats = await fs.stat(backupPath);
      const age = now - stats.mtimeMs;

      if (age > expiryMs) {
        await fs.unlink(backupPath);
        logger.debug(`[BackupManager] Deleted expired backup: ${backupPath}`);
      }
    }
  } catch (error) {
    logger.error(`[BackupManager] Cleanup failed: ${error.message}`);
    // No throw - cleanup es opcional
  }
}

/**
 * Lista backups disponibles para un archivo
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {Promise<Array>} Lista de backups con metadata
 */
export async function listBackups(projectPath, filePath) {
  const backupDir = path.join(projectPath, BACKUP_DIR);
  const safeFileName = filePath.replace(/\//g, '_').replace(/\\/g, '_');

  try {
    const files = await fs.readdir(backupDir);
    const matchingBackups = files
      .filter(f => f.startsWith(safeFileName) && f.endsWith('.bak'))
      .sort()
      .reverse();

    const backups = [];
    for (const backupFile of matchingBackups) {
      const backupPath = path.join(backupDir, backupFile);
      const stats = await fs.stat(backupPath);
      
      backups.push({
        fileName: backupFile,
        path: backupPath,
        createdAt: stats.mtime,
        size: stats.size,
        ageHours: Math.round((Date.now() - stats.mtimeMs) / (1000 * 60 * 60))
      });
    }

    return backups;
  } catch (error) {
    logger.error(`[BackupManager] List failed: ${error.message}`);
    return [];
  }
}
