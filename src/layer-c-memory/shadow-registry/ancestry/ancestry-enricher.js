/**
 * @fileoverview Ancestry Enricher - Enriquecimiento de ancestros
 * 
 * Responsabilidad Única (SRP): Enriquecer átomos con información de ancestros.
 * 
 * @module layer-c-memory/shadow-registry/ancestry
 */

import { createLogger } from '../../../utils/logger.js';
import { propagateInheritance } from '../lineage-tracker.js';
import { findBestMatch } from '../search/similarity-search.js';

const logger = createLogger('OmnySys:shadow-registry:ancestry');

/**
 * Crea metadatos de ancestros para un átomo génesis (sin ancestros)
 * @param {string} atomId 
 * @returns {Object} Metadatos de ancestros génesis
 */
export function createGenesisAncestry(atomId) {
  return {
    generation: 0,
    lineage: [],
    vibrationScore: 0,
    genesis: true,
    atomId
  };
}

/**
 * Crea metadatos de ancestros basados en una sombra predecesora
 * @param {Object} shadow - Sombra predecesora
 * @param {Object} atom - Átomo actual
 * @param {number} similarity - Puntuación de similitud
 * @returns {Object} Metadatos de ancestros enriquecidos
 */
export function createInheritedAncestry(shadow, atom, similarity) {
  return propagateInheritance(shadow, atom, similarity);
}

/**
 * Enriquece un átomo con información de ancestros
 * @param {Object} atom - Átomo a enriquecer
 * @param {Object} indexManager - Gestor de índice
 * @param {Function} getShadow - Función para obtener sombra
 * @param {Function} markReplacedFn - Función para marcar sombra como reemplazada
 * @param {number} minSimilarity - Umbral mínimo de similitud (default: 0.85)
 * @returns {Promise<Object>} Átomo enriquecido
 */
export async function enrichWithAncestry(
  atom, 
  indexManager, 
  getShadow, 
  markReplacedFn,
  minSimilarity = 0.85
) {
  // Buscar mejor match
  const match = await findBestMatch(atom, indexManager, getShadow, minSimilarity);
  
  if (!match) {
    // Génesis - nuevo átomo sin ancestros
    atom.ancestry = createGenesisAncestry(atom.id);
    return atom;
  }
  
  // Propagar herencia desde la sombra encontrada
  atom.ancestry = createInheritedAncestry(match.shadow, atom, match.similarity);
  
  // Marcar sombra como reemplazada
  await markReplacedFn(match.shadow.shadowId, atom.id);
  
  logger.info(`🧬 Ancestry enriched for ${atom.id} ← ${match.shadow.shadowId} (${match.similarity.toFixed(2)})`);
  
  return atom;
}

/**
 * Calcula el score de vibración basado en el lineage
 * @param {Object[]} lineage - Array de ancestros
 * @returns {number} Score de vibración
 */
export function calculateVibrationScore(lineage) {
  if (!lineage || lineage.length === 0) {
    return 0;
  }
  
  // Fórmula: suma ponderada de generaciones
  let score = 0;
  for (let i = 0; i < lineage.length; i++) {
    score += (i + 1) * 10; // Cada generación añade valor
  }
  
  return score;
}

/**
 * Reconstruye el lineage completo de un átomo
 * @param {string} atomId 
 * @param {Function} getShadow 
 * @returns {Promise<Object[]>} Array de ancestros ordenados
 */
export async function reconstructFullLineage(atomId, getShadow) {
  const lineage = [];
  let currentId = atomId;
  
  while (currentId) {
    const shadow = await getShadow(currentId);
    if (!shadow) break;
    
    lineage.unshift({
      shadowId: shadow.shadowId,
      originalId: shadow.originalId,
      diedAt: shadow.diedAt,
      reason: shadow.death?.reason,
      generation: shadow.lineage?.generation || 0
    });
    
    // Buscar ancestro anterior
    currentId = shadow.lineage?.parentId;
  }
  
  return lineage;
}
