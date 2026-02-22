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
 * Gestor de versiones de átomos para actualizaciones incrementales
 */
export class AtomVersionManager {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.versionsPath = path.join(rootPath, DATA_DIR, VERSIONS_FILE);
    this.versionsCache = null;
    this.cacheDirty = false;
  }

  /**
   * Carga el archivo de versiones (con caché en memoria)
   * @private
   */
  async _loadVersions() {
    if (this.versionsCache !== null) {
      return this.versionsCache;
    }
    
    try {
      const content = await fs.readFile(this.versionsPath, 'utf-8');
      this.versionsCache = JSON.parse(content);
    } catch {
      // Archivo no existe o está corrupto
      this.versionsCache = { atoms: {}, lastUpdated: Date.now() };
    }
    
    return this.versionsCache;
  }

  /**
   * Guarda el archivo de versiones si hay cambios
   * @private
   */
  async _saveVersions() {
    if (!this.cacheDirty) return;
    
    try {
      await fs.mkdir(path.dirname(this.versionsPath), { recursive: true });
      await fs.writeFile(
        this.versionsPath, 
        JSON.stringify(this.versionsCache, null, 2)
      );
      this.cacheDirty = false;
    } catch (error) {
      console.warn('⚠️ Failed to save atom versions:', error.message);
    }
  }

  /**
   * Registra la versión actual de un átomo
   * 
   * @param {string} atomId - ID único del átomo
   * @param {Object} atomData - Datos del átomo
   * @returns {Promise<Object>} Versión registrada
   */
  async trackAtomVersion(atomId, atomData) {
    const versions = await this._loadVersions();
    
    const version = {
      hash: calculateHash(atomData),
      fieldHashes: calculateFieldHashes(atomData),
      lastModified: Date.now(),
      filePath: atomData.filePath,
      atomName: atomData.name
    };
    
    versions.atoms[atomId] = version;
    versions.lastUpdated = Date.now();
    this.cacheDirty = true;
    
    // Guardar periódicamente (cada 10 cambios)
    const atomCount = Object.keys(versions.atoms).length;
    if (atomCount % 10 === 0) {
      await this._saveVersions();
    }
    
    return version;
  }

  /**
   * Detecta qué campos cambiaron desde la última versión
   * 
   * @param {string} atomId - ID del átomo
   * @param {Object} newData - Nuevos datos del átomo
   * @returns {Promise<Object>} Cambios detectados
   */
  async detectChanges(atomId, newData) {
    const versions = await this._loadVersions();
    const oldVersion = versions.atoms[atomId];
    
    if (!oldVersion) {
      return { 
        isNew: true, 
        fields: Object.keys(newData).filter(k => !k.startsWith('_')),
        hasChanges: true 
      };
    }
    
    const newFieldHashes = calculateFieldHashes(newData);
    const changedFields = [];
    const unchangedFields = [];
    
    // Detectar campos modificados
    for (const [field, newHash] of Object.entries(newFieldHashes)) {
      if (oldVersion.fieldHashes[field] !== newHash) {
        changedFields.push(field);
      } else {
        unchangedFields.push(field);
      }
    }
    
    // Detectar campos eliminados
    for (const field of Object.keys(oldVersion.fieldHashes)) {
      if (!(field in newFieldHashes)) {
        changedFields.push(field);
      }
    }
    
    return {
      isNew: false,
      fields: changedFields,
      unchangedFields,
      hasChanges: changedFields.length > 0,
      previousModified: oldVersion.lastModified
    };
  }

  /**
   * Obtiene la última versión conocida de un átomo
   * 
   * @param {string} atomId - ID del átomo
   * @returns {Promise<Object|null>} Versión o null si no existe
   */
  async getVersion(atomId) {
    const versions = await this._loadVersions();
    return versions.atoms[atomId] || null;
  }

  /**
   * Elimina un átomo del registro de versiones
   * 
   * @param {string} atomId - ID del átomo a eliminar
   */
  async removeAtomVersion(atomId) {
    const versions = await this._loadVersions();
    if (versions.atoms[atomId]) {
      delete versions.atoms[atomId];
      this.cacheDirty = true;
    }
  }

  /**
   * Fuerza el guardado del caché de versiones
   */
  async flush() {
    await this._saveVersions();
  }

  /**
   * Obtiene estadísticas de versiones
   * 
   * @returns {Promise<Object>} Estadísticas
   */
  async getStats() {
    const versions = await this._loadVersions();
    const atoms = Object.values(versions.atoms);
    
    return {
      totalTracked: atoms.length,
      lastUpdated: versions.lastUpdated,
      oldestVersion: atoms.length > 0 
        ? Math.min(...atoms.map(v => v.lastModified))
        : null,
      newestVersion: atoms.length > 0
        ? Math.max(...atoms.map(v => v.lastModified))
        : null
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
