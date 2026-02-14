/**
 * @fileoverview Index Manager - Gestión del índice de sombras
 * 
 * Responsabilidad Única (SRP): Manejar el índice de metadatos de sombras.
 * 
 * @module layer-c-memory/shadow-registry/storage
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { ShadowStatus } from '../types.js';

const logger = createLogger('OmnySys:shadow-registry:index');

/**
 * Gestiona el índice de sombras
 */
export class IndexManager {
  constructor(indexPath) {
    this.indexPath = indexPath;
  }

  /**
   * Inicializa el índice si no existe
   */
  async initialize() {
    try {
      await fs.access(this.indexPath);
    } catch {
      await this.save({ shadows: {}, lineages: {} });
    }
  }

  /**
   * Carga el índice
   * @returns {Promise<Object>}
   */
  async load() {
    const content = await fs.readFile(this.indexPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Guarda el índice
   * @param {Object} index 
   */
  async save(index) {
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Actualiza la entrada de una sombra en el índice
   * @param {Object} shadow 
   */
  async updateShadow(shadow) {
    const index = await this.load();
    
    index.shadows[shadow.shadowId] = {
      shadowId: shadow.shadowId,
      originalId: shadow.originalId,
      status: shadow.status,
      replacedBy: shadow.replacedBy,
      diedAt: shadow.diedAt,
      flowType: shadow.dna?.flowType,
      patternHash: shadow.dna?.patternHash,
      generation: shadow.lineage?.generation
    };
    
    await this.save(index);
  }

  /**
   * Actualiza el lineage de una sombra
   * @param {string} parentId 
   * @param {string} childId 
   */
  async updateLineage(parentId, childId) {
    const index = await this.load();
    
    if (!index.lineages[parentId]) {
      index.lineages[parentId] = [];
    }
    index.lineages[parentId].push(childId);
    
    await this.save(index);
  }

  /**
   * Obtiene todos los shadowIds
   * @returns {Promise<string[]>}
   */
  async getAllShadowIds() {
    const index = await this.load();
    return Object.keys(index.shadows);
  }

  /**
   * Obtiene entradas filtradas
   * @param {Object} filters 
   * @returns {Promise<Object[]>}
   */
  async getEntries(filters = {}) {
    const index = await this.load();
    let entries = Object.values(index.shadows);
    
    if (filters.status) {
      entries = entries.filter(s => s.status === filters.status);
    }
    
    if (filters.flowType) {
      entries = entries.filter(s => s.flowType === filters.flowType);
    }
    
    if (filters.patternHash) {
      entries = entries.filter(s => s.patternHash === filters.patternHash);
    }
    
    return entries;
  }

  /**
   * Obtiene una entrada específica
   * @param {string} shadowId 
   * @returns {Promise<Object|undefined>}
   */
  async getEntry(shadowId) {
    const index = await this.load();
    return index.shadows[shadowId];
  }
}
