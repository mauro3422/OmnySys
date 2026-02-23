/**
 * @fileoverview Shadow Registry - Sistema de registro de sombras (átomos muertos)
 * 
 * Responsabilidad Única (SRP): Guardar y recuperar sombras de átomos borrados.
 * Mantiene el linaje evolutivo para "conexiones vibrantes".
 * 
 * SSOT: Única fuente de verdad para el historial de átomos.
 * 
 * @module layer-c-memory/shadow-registry
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { validateForLineage } from '../../layer-b-semantic/validators/lineage-validator/index.js';
import { registerDeath, reconstructLineage } from './lineage-tracker/index.js';
import { ShadowStatus } from './types.js';
import { ShadowCache } from './cache/lru-cache.js';
import { ShadowStorage } from './storage/shadow-storage.js';
import { IndexManager } from './storage/index-manager.js';
import { extractOrCreateDNA } from './dna/dna-helpers.js';
import { findSimilarShadows, findBestMatch } from './search/similarity-search.js';
import { enrichWithAncestry, createGenesisAncestry } from './ancestry/ancestry-enricher.js';

const logger = createLogger('OmnySys:shadow-registry');

/**
 * Shadow Registry - Clase principal
 */
export class ShadowRegistry {
  constructor(dataPath, rootPath = null) {
    this.dataPath = dataPath;
    this.rootPath = rootPath || dataPath.replace('.omnysysdata', '');
    this.shadowsPath = path.join(dataPath, 'shadows');
    this.indexPath = path.join(this.shadowsPath, 'index.json');
    this.initialized = false;
    
    // Componentes modulares
    this.cache = new ShadowCache(100);
    this.storage = new ShadowStorage(this.shadowsPath, this.rootPath);
    this.indexManager = new IndexManager(this.indexPath);
  }

  /**
   * Inicializa el registro
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.shadowsPath, { recursive: true });
      await this.indexManager.initialize();
      
      this.initialized = true;
      logger.info('✅ Shadow Registry initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Shadow Registry:', error);
      throw error;
    }
  }

  /**
   * Crea una sombra a partir de un átomo que se está borrando
   * 
   * @param {Object} atom - Átomo a "enterrar"
   * @param {Object} options
   * @param {string} options.reason - Razón del borrado
   * @param {string} [options.replacementId] - ID del átomo que lo reemplaza
   * @returns {Promise<Object>} Sombra creada
   */
  async createShadow(atom, options = {}) {
    await this.initialize();
    
    // 1. Validar metadatos
    const validation = validateForLineage(atom);
    if (!validation.valid) {
      logger.warn(`⚠️ Invalid atom metadata for ${atom.id}:`, validation.errors);
      // Continuamos de todos modos, pero logueamos
    }
    
    // 2. Extraer o crear DNA
    atom.dna = extractOrCreateDNA(atom);
    
    // 3. Crear sombra
    const shadow = registerDeath(atom, {
      reason: options.reason || 'file_deleted',
      replacementId: options.replacementId,
      commits: options.commits,
      risk: options.risk
    });
    
    // 4. Guardar
    await this._saveShadow(shadow);
    await this.indexManager.updateShadow(shadow);
    
    // 5. Si tiene ancestro, actualizar lineage
    if (atom.ancestry?.replaced) {
      await this._updateLineage(atom.ancestry.replaced, shadow.shadowId);
    }
    
    logger.info(`🪦 Shadow created: ${shadow.shadowId} (from ${atom.id})`);
    return shadow;
  }

  /**
   * Busca sombras similares a un átomo (para detectar reemplazo)
   * 
   * @param {Object} atom - Átomo a comparar
   * @param {Object} options
   * @param {number} [options.minSimilarity=0.75] - Umbral mínimo
   * @param {number} [options.limit=5] - Máximo resultados
   * @returns {Promise<Array<{shadow: Object, similarity: number}>>}
   */
  async findSimilar(atom, options = {}) {
    await this.initialize();
    
    // Asegurar que el átomo tenga DNA
    if (!atom.dna && atom.dataFlow) {
      atom.dna = extractOrCreateDNA(atom);
    }
    
    return findSimilarShadows(atom, this.indexManager, (id) => this.getShadow(id), options);
  }

  /**
   * Enriquece un átomo con información de ancestros
   * 
   * @param {Object} atom - Átomo a enriquecer
   * @returns {Promise<Object>} Átomo con ancestry
   */
  async enrichWithAncestry(atom) {
    await this.initialize();
    
    return enrichWithAncestry(
      atom,
      this.indexManager,
      (id) => this.getShadow(id),
      (shadowId, replacementId) => this.markReplaced(shadowId, replacementId)
    );
  }

  /**
   * Marca una sombra como reemplazada
   * 
   * @param {string} shadowId - ID de la sombra
   * @param {string} replacementId - ID del átomo reemplazo
   */
  async markReplaced(shadowId, replacementId) {
    const shadow = await this.getShadow(shadowId);
    if (!shadow) return;
    
    shadow.status = ShadowStatus.REPLACED;
    shadow.replacedBy = replacementId;
    shadow.death.replacementId = replacementId;
    
    await this._saveShadow(shadow);
    await this.indexManager.updateShadow(shadow);
    
    logger.debug(`🏷️ Shadow ${shadowId} marked as replaced by ${replacementId}`);
  }

  /**
   * Obtiene una sombra por ID
   * 
   * @param {string} shadowId 
   * @returns {Promise<Object|null>}
   */
  async getShadow(shadowId) {
    // Check cache
    if (this.cache.has(shadowId)) {
      return this.cache.get(shadowId);
    }
    
    // Cargar desde storage
    const shadow = await this.storage.load(shadowId);
    if (shadow) {
      this.cache.set(shadowId, shadow);
    }
    
    return shadow;
  }

  /**
   * Obtiene el lineage completo de un átomo/sombra
   * 
   * @param {string} shadowId 
   * @returns {Promise<Object[]>}
   */
  async getLineage(shadowId) {
    return reconstructLineage(shadowId, (id) => this.getShadow(id));
  }

  /**
   * Lista todas las sombras
   * 
   * @param {Object} filters
   * @returns {Promise<Object[]>}
   */
  async listShadows(filters = {}) {
    return this.indexManager.getEntries(filters);
  }

  // === Private methods ===

  async _saveShadow(shadow) {
    await this.storage.save(shadow);
    this.cache.set(shadow.shadowId, shadow);
  }

  async _updateLineage(parentId, childId) {
    const parent = await this.getShadow(parentId);
    if (parent) {
      parent.lineage.childShadowIds.push(childId);
      await this._saveShadow(parent);
    }
  }
}

// Singleton para uso global
let globalRegistry = null;

export function getShadowRegistry(dataPath) {
  if (!globalRegistry) {
    globalRegistry = new ShadowRegistry(dataPath);
  }
  return globalRegistry;
}

export function resetShadowRegistry() {
  globalRegistry = null;
}
