import { statsPool } from '../../../shared/utils/stats-pool.js';
/**
 * @fileoverview atom-version-manager.js
 *
 * Gestiona versiones y tracking de cambios incrementales de átomos.
 * Permite detectar qué campos específicos cambiaron entre análisis.
 *
 * @module layer-c-memory/storage/atoms/atom-version-manager
 */

import { createLogger } from '../../../utils/logger.js';
import { persistAtomVersionArchiveSnapshot } from '../../../shared/compiler/atom-history-archive.js';
import {
  buildAtomChangeDetection,
  loadFieldHashes,
  trackAtomVersionWithDb
} from './atom-version-manager-helpers.js';

const logger = createLogger('OmnySys:AtomVersionManager');

export { calculateFieldHashes } from './atom-version-manager-helpers.js';

async function ensureDbForManager(manager) {
  if (manager.db) return;
  const { connectionManager } = await import('../database/connection.js');
  manager.db = connectionManager.getDatabase();
}

async function runAtomVersionOperation(manager, action, operation) {
  try {
    await ensureDbForManager(manager);
    return await operation(manager.db);
  } catch (error) {
    logger.error(`Failed to ${action}: ${error.message}`);
    throw error;
  }
}

function getAtomVersionRow(db, atomId) {
  return db.prepare('SELECT * FROM atom_versions WHERE atom_id = ?').get(atomId);
}

function buildAtomVersionSnapshot(db, atomId) {
  const row = getAtomVersionRow(db, atomId);
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

function detectAtomVersionChanges(db, atomId, newData) {
  const row = getAtomVersionRow(db, atomId);
  return buildAtomChangeDetection(row, atomId, newData, logger);
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
    return runAtomVersionOperation(this, `track atom version for ${atomId}`, async (db) => {
      const version = trackAtomVersionWithDb(db, atomId, atomData);
      try {
        persistAtomVersionArchiveSnapshot(this.rootPath, atomId, atomData, version, { source: 'atom-version-manager' });
      } catch (error) {
        logger.warn(`Atom version archive persistence failed for ${atomId}: ${error.message}`);
      }
      return version;
    });
  }

  /**
   * Detecta qué campos cambiaron desde la última versión consultando la DB
   * 
   * @param {string} atomId - ID del átomo
   * @param {Object} newData - Nuevos datos del átomo
   * @returns {Promise<Object>} Cambios detectados
   */
  async detectChanges(atomId, newData) {
    return runAtomVersionOperation(this, `detect changes for ${atomId}`, async (db) => {
      return detectAtomVersionChanges(db, atomId, newData);
    });
  }

  /**
   * Obtiene la última versión conocida de un átomo
   * 
   * @param {string} atomId - ID del átomo
   * @returns {Promise<Object|null>} Versión o null si no existe
   */
  async getVersion(atomId) {
    return runAtomVersionOperation(this, `get version for ${atomId}`, async (db) => {
      return buildAtomVersionSnapshot(db, atomId);
    });
  }

  /**
   * Elimina un átomo del registro de versiones
   * 
   * @param {string} atomId - ID del átomo a eliminar
   */
  async removeAtomVersion(atomId) {
    return runAtomVersionOperation(this, `remove atom version for ${atomId}`, async (db) => {
      db.prepare('DELETE FROM atom_versions WHERE atom_id = ?').run(atomId);
    });
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
  getAtomVersionManagerStats() {
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

