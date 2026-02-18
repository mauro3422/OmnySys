/**
 * @fileoverview Schema Resolver
 * 
 * Resuelve y carga schemas JSON para validación de respuestas LLM.
 * Soporta múltiples candidatos y fallback.
 * 
 * @module prompt-engine/core/schema-resolver
 * @version 1.0.0
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('prompt-engine:schema-resolver');

// Mapeo de tipos de análisis a archivos de schema
const SCHEMA_MAPPING = {
  'dynamic-imports': 'dynamic-imports.json',
  'semantic-connections': 'semantic-connections.json',
  'god-object': 'god-object.json',
  'orphan-module': 'orphan-module.json',
  'singleton': 'singleton.json',
  'default': 'default.json'
};

/**
 * Valida que el nombre del tipo sea seguro para filesystem
 * @param {string} analysisType - Tipo de análisis
 * @returns {boolean} - True si es seguro
 */
function isSafeTypeName(analysisType) {
  return typeof analysisType === 'string' && 
         /^[a-z0-9-]+$/i.test(analysisType);
}

/**
 * Genera lista de candidatos de schema a intentar
 * @param {string} analysisType - Tipo de análisis
 * @returns {Array<string>} - Lista de candidatos
 */
function generateCandidates(analysisType) {
  const candidates = [];
  
  // 1. Intentar tipo exacto
  if (isSafeTypeName(analysisType)) {
    candidates.push(`${analysisType}.json`);
  }
  
  // 2. Intentar mapeo conocido
  if (SCHEMA_MAPPING[analysisType]) {
    candidates.push(SCHEMA_MAPPING[analysisType]);
  }
  
  // 3. Fallback a default
  candidates.push(SCHEMA_MAPPING.default);
  
  return candidates;
}

/**
 * Resuelve el schema JSON para un tipo de análisis.
 * Usa fs.readFile + JSON.parse en lugar de import() con assert/with
 * para compatibilidad con Node 18, 20 y 22.
 *
 * @param {string} analysisType - Tipo de análisis
 * @returns {Promise<Object>} - Schema cargado
 */
export async function resolveSchema(analysisType) {
  const candidates = generateCandidates(analysisType);
  
  for (const schemaFile of candidates) {
    try {
      const schemaUrl = new URL(`../json-schemas/${schemaFile}`, import.meta.url);
      const schemaPath = fileURLToPath(schemaUrl);
      const content = await readFile(schemaPath, 'utf8');
      const schema = JSON.parse(content);
      
      logger.debug(`Loaded schema: ${schemaFile}`);
      return schema;
    } catch (error) {
      // Intentar siguiente candidato
      logger.debug(`Failed to load schema ${schemaFile}: ${error.message}`);
    }
  }
  
  logger.warn(`No schema found for analysis type: ${analysisType}`);
  return {};
}

/**
 * Obtiene el schema síncronamente (versión cacheada)
 * @param {string} analysisType - Tipo de análisis
 * @param {Map} cache - Cache de schemas
 * @returns {Object|null} - Schema o null
 */
export function getSchemaSync(analysisType, cache = new Map()) {
  if (cache.has(analysisType)) {
    return cache.get(analysisType);
  }
  return null;
}

/**
 * Precarga schemas en cache
 * @param {Array<string>} analysisTypes - Tipos a precargar
 * @param {Map} cache - Cache a poblar
 * @returns {Promise<number>} - Cantidad de schemas cargados
 */
export async function preloadSchemas(analysisTypes, cache = new Map()) {
  let loaded = 0;
  
  for (const type of analysisTypes) {
    if (!cache.has(type)) {
      const schema = await resolveSchema(type);
      cache.set(type, schema);
      loaded++;
    }
  }
  
  logger.info(`Preloaded ${loaded} schemas`);
  return loaded;
}

/**
 * Verifica si existe schema para un tipo
 * @param {string} analysisType - Tipo de análisis
 * @returns {Promise<boolean>} - True si existe
 */
export async function hasSchema(analysisType) {
  const schema = await resolveSchema(analysisType);
  return Object.keys(schema).length > 0;
}

/**
 * Lista todos los schemas disponibles
 * @returns {Array<string>} - Lista de tipos con schema
 */
export function listAvailableSchemas() {
  return Object.keys(SCHEMA_MAPPING).filter(k => k !== 'default');
}
