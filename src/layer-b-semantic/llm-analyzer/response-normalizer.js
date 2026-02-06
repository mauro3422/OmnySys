/**
 * @fileoverview response-normalizer.js
 * 
 * Normaliza y valida las respuestas del LLM
 * 
 * @module llm-analyzer/response-normalizer
 */

/**
 * Normaliza la respuesta del LLM
 * @param {object} response - Respuesta del LLM
 * @param {string} filePath - Ruta del archivo
 * @param {number} confidenceThreshold - Umbral mínimo de confianza
 * @returns {object|null} - Respuesta normalizada o null
 */
export function normalizeResponse(response, filePath, confidenceThreshold = 0.7) {
  console.log(`🔍 DEBUG normalizeResponse: ${filePath}`, JSON.stringify(response).substring(0, 200));

  if (!response || response.error) {
    console.warn(`⚠️  Invalid LLM response for ${filePath}`);
    return null;
  }

  // Si la respuesta no es JSON estructurado, rechazar
  if (response.rawResponse) {
    console.warn(`⚠️  LLM returned raw text for ${filePath}, expected JSON`);
    return null;
  }

  // Buscar campos en diferentes niveles del objeto response
  const baseResponse = response.analysisResult || response.analysisresult || response;
  const confidence = baseResponse.confidence || response.confidence || 0.8;
  const reasoning = baseResponse.reasoning || response.reasoning || 'No reasoning provided';

  // Schema simplificado para LFM2-Extract
  const normalized = {
    ...response,
    source: 'llm',
    confidence: confidence,
    reasoning: reasoning,
    affectedFiles: response.connectedFiles || response.potentialUsage || response.affectedFiles || [],
    suggestedConnections: response.suggestedConnections || [],
    hiddenConnections: response.hiddenConnections || [],
    localStorageKeys: response.localStorageKeys || response.sharedState?.reads || [],
    eventNames: response.eventNames || response.events?.listens || response.events?.emits || [],
    connectionType: response.connectionType || 'none'
  };

  console.log(`🔍 DEBUG normalized: ${filePath}`, JSON.stringify(normalized).substring(0, 200));

  // Convertir formatos de shared state
  if (response.sharedState || response.events) {
    normalized.sharedState = response.sharedState;
    normalized.events = response.events;
  } else if (response.connectionType === 'shared-state' || response.connectionType === 'global') {
    normalized.sharedState = {
      reads: response.sharedState?.reads || [],
      writes: response.sharedState?.writes || []
    };
    normalized.events = {
      emits: response.events?.emits || [],
      listens: response.events?.listens || []
    };
  }

  // Filtrar por umbral de confianza
  if (normalized.confidence < confidenceThreshold) {
    console.warn(`⚠️  LLM confidence too low (${normalized.confidence}) for ${filePath}`);
    return null;
  }

  console.log(`✅ Validated: ${filePath}, confidence=${normalized.confidence}`);
  return normalized;
}

/**
 * Convierte el formato simplificado de localStorage al formato interno
 * @param {string[]} keys - Keys de localStorage
 * @param {string} connectionType - Tipo de conexión
 * @returns {object} - Formato interno { reads: [], writes: [] }
 */
export function normalizeSharedStateFromSimple(keys, connectionType) {
  if (!keys || keys.length === 0) return { reads: [], writes: [] };
  
  return {
    reads: connectionType === 'localStorage' ? keys : [],
    writes: connectionType === 'localStorage' ? keys : []
  };
}

/**
 * Extrae paths válidos de archivos del proyecto para validación
 * @param {object} projectContext - Contexto del proyecto
 * @returns {string[]} - Array de paths válidos
 */
export function extractValidFilePaths(projectContext) {
  const paths = [];
  
  if (!projectContext?.fileSpecific?.allProjectFiles) {
    return paths;
  }
  
  for (const file of projectContext.fileSpecific.allProjectFiles) {
    if (file.path) {
      paths.push(file.path);
    }
  }
  
  return paths;
}
