/**
 * @fileoverview Prompt Generator
 * 
 * Genera system prompts y user prompts a partir de templates.
 * Aplica reglas anti-hallucination y reemplaza placeholders.
 * 
 * @module prompt-engine/core/prompt-generator
 * @version 1.0.0
 */

import { getRulesForType } from '../config/anti-hallucination-rules.js';
import { 
  replaceAllPlaceholders,
  createReplacementMap,
  applyReplacements
} from '../utils/placeholder-replacer.js';
import {
  compactMetadataSection,
  insertFileContent
} from '../utils/metadata-formatter.js';

const FILE_CONTENT_PLACEHOLDER = '__OMNY_FILE_CONTENT__';

/**
 * Genera el system prompt con reglas anti-hallucination
 * @param {Object} template - Template del prompt
 * @param {string} analysisType - Tipo de análisis
 * @returns {string} - System prompt completo
 */
export function generateSystemPrompt(template, analysisType) {
  const rules = getRulesForType(analysisType);
  
  return `${template.systemPrompt}

${rules}`;
}

/**
 * Genera el user prompt con contenido del archivo y metadatos
 * @param {Object} template - Template del prompt
 * @param {string} fileContent - Contenido del archivo
 * @param {Object} metadata - Metadatos del archivo
 * @returns {string} - User prompt completo
 */
export function generateUserPrompt(template, fileContent, metadata) {
  if (!template) {
    throw new Error('Template is null or undefined');
  }
  
  if (!template.userPrompt) {
    throw new Error(
      `Template is missing userPrompt. Available keys: ${Object.keys(template).join(', ')}`
    );
  }

  // Crear mapa de reemplazos
  const replacementMap = createReplacementMap(template.userPrompt, metadata);
  
  // Aplicar reemplazos
  let userPrompt = applyReplacements(template.userPrompt, replacementMap);
  
  // Compactar sección de metadata
  userPrompt = compactMetadataSection(userPrompt, FILE_CONTENT_PLACEHOLDER);
  
  // Insertar contenido real del archivo
  userPrompt = insertFileContent(userPrompt, FILE_CONTENT_PLACEHOLDER, fileContent);
  
  return userPrompt;
}

/**
 * Genera la configuración completa del prompt
 * @param {Object} template - Template del prompt
 * @param {string} fileContent - Contenido del archivo
 * @param {Object} metadata - Metadatos del archivo
 * @param {string} analysisType - Tipo de análisis
 * @param {Object} schema - Schema JSON para validación
 * @returns {Object} - Configuración completa del prompt
 */
export function generatePromptConfig(template, fileContent, metadata, analysisType, schema) {
  const systemPrompt = generateSystemPrompt(template, analysisType);
  const userPrompt = generateUserPrompt(template, fileContent, metadata);
  
  return {
    systemPrompt,
    userPrompt,
    jsonSchema: schema,
    analysisType,
    temperature: 0.0,
    maxTokens: 2000
  };
}

/**
 * Opciones para generación de prompts
 */
export const PromptGenerationOptions = {
  DEFAULT: {
    temperature: 0.0,
    maxTokens: 2000,
    enableCompacting: true
  },
  
  FAST: {
    temperature: 0.0,
    maxTokens: 1000,
    enableCompacting: true
  },
  
  DETAILED: {
    temperature: 0.0,
    maxTokens: 4000,
    enableCompacting: false
  }
};

/**
 * Genera prompt con opciones personalizadas
 * @param {Object} template - Template
 * @param {string} fileContent - Contenido
 * @param {Object} metadata - Metadatos
 * @param {string} analysisType - Tipo
 * @param {Object} schema - Schema
 * @param {Object} options - Opciones
 * @returns {Object} - Configuración del prompt
 */
export function generatePromptWithOptions(
  template, 
  fileContent, 
  metadata, 
  analysisType, 
  schema,
  options = PromptGenerationOptions.DEFAULT
) {
  const config = generatePromptConfig(template, fileContent, metadata, analysisType, schema);
  
  return {
    ...config,
    temperature: options.temperature ?? 0.0,
    maxTokens: options.maxTokens ?? 2000
  };
}
