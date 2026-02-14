/**
 * @fileoverview Shadow Storage - Persistencia de sombras
 * 
 * Responsabilidad Única (SRP): Guardar y cargar sombras del filesystem.
 * 
 * @module layer-c-memory/shadow-registry/storage
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:shadow-registry:storage');

/**
 * Gestiona el almacenamiento de sombras en disco
 */
export class ShadowStorage {
  constructor(shadowsPath) {
    this.shadowsPath = shadowsPath;
  }

  /**
   * Guarda una sombra en disco
   * @param {Object} shadow 
   */
  async save(shadow) {
    const filePath = path.join(this.shadowsPath, `${shadow.shadowId}.json`);
    await fs.writeFile(filePath, JSON.stringify(shadow, null, 2));
  }

  /**
   * Carga una sombra desde disco
   * @param {string} shadowId 
   * @returns {Promise<Object|null>}
   */
  async load(shadowId) {
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
    try {
      const filePath = path.join(this.shadowsPath, `${shadowId}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Elimina una sombra del disco
   * @param {string} shadowId 
   */
  async delete(shadowId) {
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
