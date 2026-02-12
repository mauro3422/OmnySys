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
import { extractDNA, compareDNA } from '../../layer-a-static/extractors/metadata/dna-extractor.js';
import { validateForLineage, validateMatch } from '../../layer-b-semantic/validators/lineage-validator.js';
import { registerDeath, registerBirth, propagateInheritance, reconstructLineage } from './lineage-tracker.js';
import { ShadowStatus } from './types.js';

const logger = createLogger('OmnySys:shadow-registry');

/**
 * Shadow Registry - Clase principal
 */
export class ShadowRegistry {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.shadowsPath = path.join(dataPath, 'shadows');
    this.indexPath = path.join(this.shadowsPath, 'index.json');
    this.initialized = false;
    
    // Cache en memoria (LRU simple)
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * Inicializa el registro
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.shadowsPath, { recursive: true });
      
      // Crear índice si no existe
      try {
        await fs.access(this.indexPath);
      } catch {
        await this._saveIndex({ shadows: {}, lineages: {} });
      }
      
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
    
    // 2. Extraer DNA si no lo tiene y tiene dataFlow
    if (!atom.dna && atom.dataFlow) {
      try {
        atom.dna = extractDNA(atom);
      } catch (error) {
        logger.warn(`⚠️ Could not extract DNA for ${atom.id}: ${error.message}`);
        // Crear DNA mínimo para continuar
        atom.dna = {
          structuralHash: 'unknown',
          patternHash: 'unknown',
          flowType: 'unknown',
          operationSequence: [],
          complexityScore: 0,
          inputCount: 0,
          outputCount: 0,
          transformationCount: 0,
          semanticFingerprint: 'unknown',
          extractedAt: new Date().toISOString(),
          version: '1.0.0-fallback'
        };
      }
    }
    
    // Si todavía no tiene DNA, crear uno fallback
    if (!atom.dna) {
      atom.dna = {
        structuralHash: 'unknown',
        patternHash: 'unknown',
        flowType: 'unknown',
        operationSequence: [],
        complexityScore: 0,
        inputCount: 0,
        outputCount: 0,
        transformationCount: 0,
        semanticFingerprint: 'unknown',
        extractedAt: new Date().toISOString(),
        version: '1.0.0-fallback'
      };
    }
    
    // 3. Crear sombra
    const shadow = registerDeath(atom, {
      reason: options.reason || 'file_deleted',
      replacementId: options.replacementId,
      commits: options.commits,
      risk: options.risk
    });
    
    // 4. Guardar
    await this._saveShadow(shadow);
    await this._updateIndex(shadow);
    
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
    
    const minSimilarity = options.minSimilarity || 0.75;
    const limit = options.limit || 5;
    
    // Si el átomo no tiene DNA válido, no podemos buscar similares
    if (!atom.dna || atom.dna.flowType === 'unknown') {
      logger.debug(`Atom ${atom.id} has no valid DNA, skipping similarity search`);
      return [];
    }
    
    // Extraer DNA si es necesario y el átomo tiene dataFlow
    if (!atom.dna && atom.dataFlow) {
      try {
        atom.dna = extractDNA(atom);
      } catch (error) {
        logger.warn(`⚠️ Could not extract DNA for ${atom.id}: ${error.message}`);
        // Crear DNA mínimo para continuar
        atom.dna = {
          structuralHash: 'unknown',
          patternHash: 'unknown',
          flowType: 'unknown',
          operationSequence: [],
          complexityScore: 0,
          inputCount: 0,
          outputCount: 0,
          transformationCount: 0,
          semanticFingerprint: 'unknown',
          extractedAt: new Date().toISOString(),
          version: '1.0.0-fallback'
        };
      }
    }
    
    const candidates = [];
    const index = await this._loadIndex();
    
    // Buscar candidatos por patrón (optimización)
    for (const [shadowId, entry] of Object.entries(index.shadows)) {
      // Ignorar ya reemplazados (a menos que se especifique)
      if (entry.status === ShadowStatus.REPLACED && !options.includeReplaced) {
        continue;
      }
      
      // Quick filter: mismo flow type
      if (entry.flowType && entry.flowType !== atom.dna.flowType) {
        continue;
      }
      
      candidates.push(shadowId);
    }
    
    // Comparar DNA en detalle
    const results = [];
    for (const shadowId of candidates) {
      const shadow = await this.getShadow(shadowId);
      if (!shadow || !shadow.dna) continue;
      
      const similarity = compareDNA(atom.dna, shadow.dna);
      
      if (similarity >= minSimilarity) {
        // Validar match completo
        const matchValidation = validateMatch(atom, shadow);
        if (matchValidation.valid) {
          results.push({ shadow, similarity });
        }
      }
    }
    
    // Ordenar por similitud
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, limit);
  }

  /**
   * Enriquece un átomo con información de ancestros
   * 
   * @param {Object} atom - Átomo a enriquecer
   * @returns {Promise<Object>} Átomo con ancestry
   */
  async enrichWithAncestry(atom) {
    await this.initialize();
    
    // Buscar sombras similares
    const matches = await this.findSimilar(atom, { minSimilarity: 0.85, limit: 1 });
    
    if (matches.length === 0) {
      // Génesis - nuevo átomo sin ancestros
      atom.ancestry = {
        generation: 0,
        lineage: [],
        vibrationScore: 0
      };
      return atom;
    }
    
    const match = matches[0];
    
    // Propagar herencia
    atom.ancestry = propagateInheritance(match.shadow, atom);
    
    // Marcar sombra como reemplazada
    await this.markReplaced(match.shadow.shadowId, atom.id);
    
    logger.info(`🧬 Ancestry enriched for ${atom.id} ← ${match.shadow.shadowId} (${match.similarity.toFixed(2)})`);
    return atom;
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
    
    // Calcular conexiones rotas
    if (shadow.inheritance?.connections) {
      // Se llenará cuando el reemplazo se enriquezca
    }
    
    await this._saveShadow(shadow);
    await this._updateIndex(shadow);
    
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
    
    try {
      const filePath = path.join(this.shadowsPath, `${shadowId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const shadow = JSON.parse(content);
      
      // Cache
      this._addToCache(shadowId, shadow);
      
      return shadow;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
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
    const index = await this._loadIndex();
    let shadows = Object.values(index.shadows);
    
    if (filters.status) {
      shadows = shadows.filter(s => s.status === filters.status);
    }
    
    if (filters.flowType) {
      shadows = shadows.filter(s => s.flowType === filters.flowType);
    }
    
    return shadows;
  }

  // === Private methods ===

  async _saveShadow(shadow) {
    const filePath = path.join(this.shadowsPath, `${shadow.shadowId}.json`);
    await fs.writeFile(filePath, JSON.stringify(shadow, null, 2));
    this._addToCache(shadow.shadowId, shadow);
  }

  async _loadIndex() {
    const content = await fs.readFile(this.indexPath, 'utf-8');
    return JSON.parse(content);
  }

  async _saveIndex(index) {
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  async _updateIndex(shadow) {
    const index = await this._loadIndex();
    
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
    
    await this._saveIndex(index);
  }

  async _updateLineage(parentId, childId) {
    const parent = await this.getShadow(parentId);
    if (parent) {
      parent.lineage.childShadowIds.push(childId);
      await this._saveShadow(parent);
    }
  }

  _addToCache(shadowId, shadow) {
    if (this.cache.size >= this.maxCacheSize) {
      // Eliminar el más antiguo (primer entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(shadowId, shadow);
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
