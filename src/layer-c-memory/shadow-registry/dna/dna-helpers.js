/**
 * @fileoverview DNA Helpers - Utilidades para manipulación de DNA
 * 
 * Responsabilidad Única (SRP): Crear y validar DNA de átomos.
 * 
 * @module layer-c-memory/shadow-registry/dna
 */

import { createLogger } from '../../../utils/logger.js';
import { extractDNA } from '../../../layer-a-static/extractors/metadata/dna-extractor.js';

const logger = createLogger('OmnySys:shadow-registry:dna');

/**
 * Crea un DNA fallback cuando no se puede extraer el DNA real
 * @returns {Object} DNA fallback
 */
export function createFallbackDNA() {
  return {
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

/**
 * Extrae o crea DNA para un átomo
 * @param {Object} atom - Átomo a procesar
 * @returns {Object} DNA del átomo
 */
export function extractOrCreateDNA(atom) {
  // Si ya tiene DNA, retornarlo
  if (atom.dna) {
    return atom.dna;
  }
  
  // Si tiene dataFlow, intentar extraer
  if (atom.dataFlow) {
    try {
      return extractDNA(atom);
    } catch (error) {
      logger.warn(`⚠️ Could not extract DNA for ${atom.id}: ${error.message}`);
      return createFallbackDNA();
    }
  }
  
  // Fallback por defecto
  return createFallbackDNA();
}

/**
 * Valida si un DNA es válido para búsqueda de similitud
 * @param {Object} dna - DNA a validar
 * @returns {boolean} true si es válido
 */
export function isValidDNA(dna) {
  return dna && dna.flowType !== 'unknown';
}

/**
 * Obtiene información resumida del DNA para el índice
 * @param {Object} dna - DNA del átomo
 * @returns {Object} Resumen del DNA
 */
export function getDNASummary(dna) {
  if (!dna) return null;
  
  return {
    flowType: dna.flowType,
    patternHash: dna.patternHash,
    structuralHash: dna.structuralHash,
    complexityScore: dna.complexityScore
  };
}
