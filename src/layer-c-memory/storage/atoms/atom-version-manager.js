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
import crypto from 'crypto';

const DATA_DIR = '.omnysysdata';
const VERSIONS_FILE = 'atom-versions.json';

/**
 * Calcula hash SHA-256 de un objeto
 * @param {*} data - Datos a hashear
 * @returns {string} Hash hex
 */
function calculateHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Calcula hashes individuales para cada campo de un átomo
 * @param {Object} atomData - Datos del átomo
 * @returns {Object} Mapa de campo -> hash
 */
export function calculateFieldHashes(atomData) {
  const hashes = {};
  const excludedFields = ['_meta', 'lineage', 'timestamp'];

  for (const [key, value] of Object.entries(atomData)) {
    if (excludedFields.includes(key)) continue;

    // Para objetos anidados, hashear recursivamente
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      hashes[key] = calculateHash(value);
    } else if (Array.isArray(value)) {
      // Para arrays, hashear cada elemento
      hashes[key] = calculateHash(value.map((item, i) =>
        typeof item === 'object' ? calculateHash(item) : `${i}:${item}`
      ));
    } else {
      hashes[key] = calculateHash(String(value));
    }
  }

  return hashes;
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
    if (this.db) return;
    const { connectionManager } = await import('../../database/connection.js');
    this.db = connectionManager.getDatabase();
  }

  /**
   * Registra la versión actual de un átomo en la DB
   * 
   * @param {string} atomId - ID único del átomo
   * @param {Object} atomData - Datos del átomo
   * @returns {Promise<Object>} Versión registrada
   */
  async trackAtomVersion(atomId, atomData) {
    await this._ensureDb();
    const version = {
      hash: calculateHash(atomData),
      fieldHashes: calculateFieldHashes(atomData),
      lastModified: Date.now(),
      filePath: atomData.file || atomData.filePath,
      atomName: atomData.name
    };

    const stmt = this.db.prepare(`
      INSERT INTO atom_versions (atom_id, hash, field_hashes_json, last_modified, file_path, atom_name)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(atom_id) DO UPDATE SET
        hash = excluded.hash,
        field_hashes_json = excluded.field_hashes_json,
        last_modified = excluded.last_modified
    `);

    stmt.run(
      atomId,
      version.hash,
      JSON.stringify(version.fieldHashes),
      version.lastModified,
      version.filePath,
      version.atomName
    );

    return version;
  }

  /**
   * Detecta qué campos cambiaron desde la última versión consultando la DB
   * 
   * @param {string} atomId - ID del átomo
   * @param {Object} newData - Nuevos datos del átomo
   * @returns {Promise<Object>} Cambios detectados
   */
  async detectChanges(atomId, newData) {
    await this._ensureDb();
    const row = this.db.prepare('SELECT * FROM atom_versions WHERE atom_id = ?').get(atomId);

    if (!row) {
      return {
        isNew: true,
        fields: Object.keys(newData).filter(k => !k.startsWith('_')),
        hasChanges: true
      };
    }

    const oldFieldHashes = JSON.parse(row.field_hashes_json || '{}');
    const newFieldHashes = calculateFieldHashes(newData);
    const changedFields = [];
    const unchangedFields = [];

    // Detectar campos modificados
    for (const [field, newHash] of Object.entries(newFieldHashes)) {
      if (oldFieldHashes[field] !== newHash) {
        changedFields.push(field);
      } else {
        unchangedFields.push(field);
      }
    }

    // Detectar campos eliminados
    for (const field of Object.keys(oldFieldHashes)) {
      if (!(field in newFieldHashes)) {
        changedFields.push(field);
      }
    }

    return {
      isNew: false,
      fields: changedFields,
      unchangedFields,
      hasChanges: changedFields.length > 0,
      previousModified: row.last_modified
    };
  }

  /**
   * Obtiene la última versión conocida de un átomo
   * 
   * @param {string} atomId - ID del átomo
   * @returns {Promise<Object|null>} Versión o null si no existe
   */
  async getVersion(atomId) {
    await this._ensureDb();
    const row = this.db.prepare('SELECT * FROM atom_versions WHERE atom_id = ?').get(atomId);
    if (!row) return null;
    return {
      hash: row.hash,
      fieldHashes: JSON.parse(row.field_hashes_json),
      lastModified: row.last_modified,
      filePath: row.file_path,
      atomName: row.atom_name
    };
  }

  /**
   * Elimina un átomo del registro de versiones
   * 
   * @param {string} atomId - ID del átomo a eliminar
   */
  async removeAtomVersion(atomId) {
    await this._ensureDb();
    this.db.prepare('DELETE FROM atom_versions WHERE atom_id = ?').run(atomId);
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
  async getStats() {
    await this._ensureDb();
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as totalTracked,
        MAX(last_modified) as newestVersion,
        MIN(last_modified) as oldestVersion
      FROM atom_versions
    `).get();

    return {
      totalTracked: stats.totalTracked,
      lastUpdated: stats.newestVersion,
      oldestVersion: stats.oldestVersion,
      newestVersion: stats.newestVersion
    };
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
