/**
 * @fileoverview response-cleaner.js
 * 
 * Limpia y normaliza respuestas JSON, util para procesar salida de LLMs
 * o cualquier JSON con artefactos (markdown, comentarios, etc.)
 * 
 * @module ai/llm/response-cleaner
 */

import {
  removeMarkdownBlocks,
  removeComments,
  removeTrailingCommas,
  normalizeQuotes,
  extractJSON,
  trimResponse
} from './json-cleaners.js';

/**
 * Limpia una respuesta para extraer JSON valido
 * Elimina markdown, comentarios y otros artefactos
 * 
 * @param {string} response - Respuesta cruda
 * @returns {string} - JSON limpio
 */
export function cleanLLMResponse(response) {
  if (!response || typeof response !== 'string') {
    return response;
  }

  let cleaned = response;

  // Paso 1: Eliminar bloques markdown
  cleaned = removeMarkdownBlocks(cleaned);

  // Paso 2: Eliminar comentarios
  cleaned = removeComments(cleaned);

  // Paso 3: Eliminar trailing commas
  cleaned = removeTrailingCommas(cleaned);

  // Paso 4: Normalizar comillas
  cleaned = normalizeQuotes(cleaned);

  // Paso 5: Extraer JSON valido
  cleaned = extractJSON(cleaned);

  // Paso 6: Trim final
  cleaned = trimResponse(cleaned);

  return cleaned;
}

/**
 * Normaliza la respuesta del analisis para manejar diferentes estructuras
 * @param {object} parsed - Respuesta parseada
 * @returns {object} - Respuesta normalizada
 */
export function normalizeAnalysisResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const normalized = { ...parsed };

  // Normalizar estructura de orphan
  normalizeOrphanStructure(normalized);

  // Normalizar estructura semantica
  normalizeSemanticStructure(normalized);

  // Normalizar patrones
  normalizePatternsStructure(normalized);

  return normalized;
}

/**
 * Normaliza la estructura de orphan
 */
function normalizeOrphanStructure(normalized) {
  if (typeof normalized.orphan === 'boolean') {
    normalized.analysis = normalized.analysis || {};
    normalized.analysis.orphan = {
      isOrphan: normalized.orphan,
      dependentCount: normalized.analysis?.orphan?.dependentCount || 0,
      suggestions: normalized.analysis?.orphan?.suggestions || []
    };
    delete normalized.orphan;
  }

  if (!normalized.analysis) {
    normalized.analysis = {};
  }
  if (!normalized.analysis.orphan) {
    normalized.analysis.orphan = {
      isOrphan: false,
      dependentCount: 0,
      suggestions: []
    };
  }
}

/**
 * Normaliza la estructura semantica
 */
function normalizeSemanticStructure(normalized) {
  if (!normalized.analysis.semantic) {
    normalized.analysis.semantic = {
      sharedState: [],
      events: { emits: [], listens: [] },
      connections: []
    };
  }

  if (!Array.isArray(normalized.analysis.semantic.sharedState)) {
    normalized.analysis.semantic.sharedState = [];
  }

  if (!normalized.analysis.semantic.events) {
    normalized.analysis.semantic.events = { emits: [], listens: [] };
  }
}

/**
 * Normaliza la estructura de patrones
 */
function normalizePatternsStructure(normalized) {
  if (!normalized.analysis.patterns) {
    normalized.analysis.patterns = {
      isStateManager: false,
      isSingleton: false,
      isGodObject: false,
      hasSideEffects: false
    };
  }
}

export default {
  cleanLLMResponse,
  normalizeAnalysisResponse
};
