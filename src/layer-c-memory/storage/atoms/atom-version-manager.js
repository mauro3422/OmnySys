import { statsPool } from '../../../shared/utils/stats-pool.js';
/**
 * @fileoverview atom-version-manager.js
 *
 * Gestiona versiones y tracking de cambios incrementales de átomos.
 * Permite detectar qué campos específicos cambiaron entre análisis.
 *
 * @module layer-c-memory/storage/atoms/atom-version-manager
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { createLogger } from '../../../utils/logger.js';
import {
  buildVersionPayload,
  calculateFieldHashes,
  diffFieldHashes,
  insertOrUpdateVersion,
  loadFieldHashes
} from './atom-version-manager-helpers.js';

const logger = createLogger('OmnySys:AtomVersionManager');

const DATA_DIR = '.omnysysdata';
const VERSIONS_FILE = 'atom-versions.json';

export { calculateFieldHashes } from './atom-version-manager-helpers.js';

async function ensureDbForManager(manager) {
  if (manager.db) return;
  const { connectionManager } = await import('../database/connection.js');
  manager.db = connectionManager.getDatabase();
}

async function trackAtomVersionForManager(manager, atomId, atomData) {
  await ensureDbForManager(manager);
  const version = buildVersionPayload(atomData);
  insertOrUpdateVersion(manager.db, atomId, version);
  return version;
}

async function detectChangesForManager(manager, atomId, newData) {
  await ensureDbForManager(manager);
  const row = manager.db.prepare('SELECT * FROM atom_versions WHERE atom_id = ?').get(atomId);

  if (!row) {
    return {
      isNew: true,
      fields: Object.keys(newData).filter(k => !k.startsWith('_')),
      hasChanges: true
    };
  }

  const oldFieldHashes = loadFieldHashes(row, atomId, logger);
  if (!oldFieldHashes) {
    return {
      isNew: true,
      fields: Object.keys(newData).filter(k => !k.startsWith('_')),
      hasChanges: true
    };
  }

  const newFieldHashes = calculateFieldHashes(newData);
  const { changedFields, unchangedFields } = diffFieldHashes(oldFieldHashes, newFieldHashes);

  return {
    isNew: false,
    fields: changedFields,
    unchangedFields,
    hasChanges: changedFields.length > 0,
    previousModified: row.last_modified
  };
}

async function getVersionForManager(manager, atomId) {
  await ensureDbForManager(manager);
  const row = manager.db.prepare('SELECT * FROM atom_versions WHERE atom_id = ?').get(atomId);
  if (!row) return null;

  const fieldHashes = loadFieldHashes(row, atomId, logger) || {};

  return {
    hash: row.hash,
    fieldHashes,
    lastModified: row.last_modified,
    filePath: row.file_path,
    atomName: row.atom_name
  };
}

async function removeAtomVersionForManager(manager, atomId) {
  await ensureDbForManager(manager);
  const hr = new BaseSqlRepository(manager.db, 'AtomVersionManager');
  hr.delete('atom_versions', 'atom_id', atomId);
}

/**
 * Gestor de versiones de átomos para actualizaciones incrementales usando SQLite
 */
export class AtomVersionManager {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.db = null;
  }

  async _ensureDb() {
    try {
      await ensureDbForManager(this);
    } catch (error) {
      logger.error(`Failed to initialize database connection: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Registra la versión actual de un átomo en la DB
   * 
   * @param {string} atomId - ID único del átomo
   * @param {Object} atomData - Datos del átomo
   * @returns {Promise<Object>} Versión registrada
   */
  async trackAtomVersion(atomId, atomData) {
    try {
      return await trackAtomVersionForManager(this, atomId, atomData);
    } catch (error) {
      logger.error(`Failed to track atom version for ${atomId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detecta qué campos cambiaron desde la última versión consultando la DB
   * 
   * @param {string} atomId - ID del átomo
   * @param {Object} newData - Nuevos datos del átomo
   * @returns {Promise<Object>} Cambios detectados
   */
  async detectChanges(atomId, newData) {
    try {
      return await detectChangesForManager(this, atomId, newData);
    } catch (error) {
      logger.error(`Failed to detect changes for ${atomId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene la última versión conocida de un átomo
   * 
   * @param {string} atomId - ID del átomo
   * @returns {Promise<Object|null>} Versión o null si no existe
   */
  async getVersion(atomId) {
    try {
      return await getVersionForManager(this, atomId);
    } catch (error) {
      logger.error(`Failed to get version for ${atomId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Elimina un átomo del registro de versiones
   * 
   * @param {string} atomId - ID del átomo a eliminar
   */
  async removeAtomVersion(atomId) {
    try {
      await removeAtomVersionForManager(this, atomId);
    } catch (error) {
      logger.error(`Failed to remove atom version for ${atomId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ya no es necesario con SQLite (auto-persist)
   */
  async flush() {
    // No-op for compatibility
  }

  /**
   * Obtiene estadísticas de versiones desde la DB
   * 
   * @returns {Promise<Object>} Estadísticas
   */
  getStats() {
    return statsPool.getModuleStats('atom-version-manager');
  }
}

/**
 * Función helper para crear instancia del gestor
 * @param {string} rootPath - Ruta raíz del proyecto
 * @returns {AtomVersionManager}
 */
export function createVersionManager(rootPath) {
  return new AtomVersionManager(rootPath);
}

