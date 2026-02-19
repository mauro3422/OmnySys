/**
 * @fileoverview Similarity Search - Búsqueda de sombras similares
 * 
 * Responsabilidad Única (SRP): Buscar sombras similares basándose en DNA.
 * 
 * @module layer-c-memory/shadow-registry/search
 */

import { createLogger } from '../../../utils/logger.js';
import { compareDNA } from '../../../layer-a-static/extractors/metadata/dna-extractor.js';
import { validateMatch } from '../../../layer-b-semantic/validators/lineage-validator/index.js';
import { ShadowStatus } from '../types.js';
import { isValidDNA } from '../dna/dna-helpers.js';

const logger = createLogger('OmnySys:shadow-registry:search');

/**
 * Resultado de búsqueda de similitud
 * @typedef {Object} SimilarityResult
 * @property {Object} shadow - Sombra encontrada
 * @property {number} similarity - Puntuación de similitud (0-1)
 */

/**
 * Opciones de búsqueda de similitud
 * @typedef {Object} SearchOptions
 * @property {number} minSimilarity - Umbral mínimo de similitud (default: 0.75)
 * @property {number} limit - Máximo de resultados (default: 5)
 * @property {boolean} includeReplaced - Incluir sombras ya reemplazadas
 */

/**
 * Busca sombras similares a un átomo
 * @param {Object} atom - Átomo a comparar
 * @param {Object} indexManager - Gestor de índice
 * @param {Function} getShadow - Función para obtener sombra por ID
 * @param {SearchOptions} options 
 * @returns {Promise<SimilarityResult[]>}
 */
export async function findSimilarShadows(atom, indexManager, getShadow, options = {}) {
  const minSimilarity = options.minSimilarity || 0.75;
  const limit = options.limit || 5;
  const includeReplaced = options.includeReplaced || false;
  
  // Validar DNA
  if (!isValidDNA(atom.dna)) {
    logger.debug(`Atom ${atom.id} has no valid DNA, skipping similarity search`);
    return [];
  }
  
  const candidates = await findCandidates(atom.dna, indexManager, includeReplaced);
  const results = await compareCandidates(atom, candidates, getShadow, minSimilarity);
  
  // Ordenar por similitud y limitar resultados
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

/**
 * Encuentra candidatos potenciales basados en filtros rápidos
 * @param {Object} dna - DNA del átomo
 * @param {Object} indexManager - Gestor de índice
 * @param {boolean} includeReplaced 
 * @returns {Promise<string[]>} IDs de sombras candidatas
 */
async function findCandidates(dna, indexManager, includeReplaced) {
  const entries = await indexManager.getEntries();
  const candidates = [];
  
  for (const entry of entries) {
    // Ignorar ya reemplazados (a menos que se especifique)
    if (entry.status === ShadowStatus.REPLACED && !includeReplaced) {
      continue;
    }
    
    // Quick filter: mismo flow type
    if (entry.flowType && entry.flowType !== dna.flowType) {
      continue;
    }
    
    candidates.push(entry.shadowId);
  }
  
  return candidates;
}

/**
 * Compara candidatos en detalle usando DNA
 * @param {Object} atom 
 * @param {string[]} candidateIds 
 * @param {Function} getShadow 
 * @param {number} minSimilarity 
 * @returns {Promise<SimilarityResult[]>}
 */
async function compareCandidates(atom, candidateIds, getShadow, minSimilarity) {
  const results = [];
  
  for (const shadowId of candidateIds) {
    try {
      const shadow = await getShadow(shadowId);
      if (!shadow || !shadow.dna) continue;
      
      const similarity = compareDNA(atom.dna, shadow.dna);
      
      if (similarity >= minSimilarity) {
        // Validar match completo
        const matchValidation = validateMatch(atom, shadow);
        if (matchValidation.valid) {
          results.push({ shadow, similarity });
        }
      }
    } catch (error) {
      logger.warn(`Error comparing shadow ${shadowId}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Busca la sombra más similar (mejor match)
 * @param {Object} atom 
 * @param {Object} indexManager 
 * @param {Function} getShadow 
 * @param {number} minSimilarity 
 * @returns {Promise<SimilarityResult|null>}
 */
export async function findBestMatch(atom, indexManager, getShadow, minSimilarity = 0.85) {
  const results = await findSimilarShadows(atom, indexManager, getShadow, {
    minSimilarity,
    limit: 1
  });
  
  return results.length > 0 ? results[0] : null;
}
