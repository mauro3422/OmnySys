/**
 * @fileoverview Shadow Storage - Persistencia de sombras
 * 
 * Responsabilidad Única (SRP): Guardar y cargar sombras del filesystem y SQLite.
 * Ahora usa SQLite (atom_events) como fuente principal.
 * 
 * @module layer-c-memory/shadow-registry/storage
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:shadow-registry:storage');

/**
 * Gestiona el almacenamiento de sombras en SQLite + filesystem
 */
export class ShadowStorage {
  constructor(shadowsPath, rootPath = null) {
    this.shadowsPath = shadowsPath;
    this.rootPath = rootPath;
    this.db = null;
  }

  /**
   * Obtiene conexión a SQLite
   */
  async _getDb() {
    if (this.db) return this.db;
    
    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(this.rootPath);
      this.db = repo?.db;
      return this.db;
    } catch (error) {
      logger.warn('SQLite not available for shadows:', error.message);
      return null;
    }
  }

  /**
   * Guarda una sombra en SQLite (atom_events) + opcional JSON
   * @param {Object} shadow 
   */
  async save(shadow) {
    const db = await this._getDb();
    
    if (db) {
      try {
        db.prepare(`
          INSERT INTO atom_events (
            atom_id, event_type, changed_fields, before_state, after_state,
            impact_score, timestamp, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          shadow.originalAtomId || shadow.shadowId,
          'deleted',
          JSON.stringify(shadow.lineage || {}),
          null,
          JSON.stringify(shadow),
          shadow.risk?.score || 0,
          shadow.createdAt || new Date().toISOString(),
          'shadow_registry'
        );
        logger.debug(`💾 Shadow saved to SQLite: ${shadow.shadowId}`);
      } catch (error) {
        logger.warn('Failed to save shadow to SQLite:', error.message);
      }
    }

    // Mantener JSON por compatibilidad (puede removerse gradualmente)
    const filePath = path.join(this.shadowsPath, `${shadow.shadowId}.json`);
    await fs.writeFile(filePath, JSON.stringify(shadow, null, 2));
  }

  /**
   * Carga una sombra desde SQLite o filesystem
   * @param {string} shadowId 
   * @returns {Promise<Object|null>}
   */
  async load(shadowId) {
    // Primero intentar SQLite
    const db = await this._getDb();
    if (db) {
      try {
        const row = db.prepare(`
          SELECT after_state FROM atom_events 
          WHERE atom_id = ? AND event_type = 'deleted'
          ORDER BY timestamp DESC LIMIT 1
        `).get(shadowId);
        
        if (row?.after_state) {
          return JSON.parse(row.after_state);
        }
      } catch (error) {
        logger.debug('Shadow not in SQLite, trying filesystem');
      }
    }
    
    // Fallback a filesystem
    try {
      const filePath = path.join(this.shadowsPath, `${shadowId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Verifica si existe una sombra
   * @param {string} shadowId 
   * @returns {Promise<boolean>}
   */
  async exists(shadowId) {
    const db = await this._getDb();
    if (db) {
      try {
        const row = db.prepare('SELECT 1 FROM atom_events WHERE atom_id = ?').get(shadowId);
        if (row) return true;
      } catch {}
    }
    
    try {
      const filePath = path.join(this.shadowsPath, `${shadowId}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Elimina una sombra
   * @param {string} shadowId 
   */
  async delete(shadowId) {
    const db = await this._getDb();
    if (db) {
      try {
        db.prepare('DELETE FROM atom_events WHERE atom_id = ?').run(shadowId);
      } catch (error) {
        logger.warn('Failed to delete shadow from SQLite:', error.message);
      }
    }
    
    try {
      const filePath = path.join(this.shadowsPath, `${shadowId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
