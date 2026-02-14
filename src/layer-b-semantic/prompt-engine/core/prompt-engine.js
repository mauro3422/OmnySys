/**
 * @fileoverview Prompt Engine Core
 * 
 * Clase principal que orquesta la generación de prompts.
 * Coordina selector, generador, validador y resolutor de schemas.
 * 
 * @module prompt-engine/core/prompt-engine
 * @version 2.0.0
 */

import promptSelector from '../prompt-selector.js';
import { generatePromptConfig } from './prompt-generator.js';
import { resolveSchema } from './schema-resolver.js';
import { validatePrompt } from '../validators/prompt-validator.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('prompt-engine');

/**
 * Configuración por defecto del engine
 */
const DEFAULT_CONFIG = {
  temperature: 0.0,
  maxTokens: 2000,
  enableCompacting: true,
  validatePrompts: true,
  throwOnValidationError: false
};

/**
 * Prompt Engine - Orquestador principal
 */
export class PromptEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.selector = promptSelector;
    this.schemaCache = new Map();
    
    logger.debug('PromptEngine initialized');
  }
  
  /**
   * Genera el prompt completo basado en metadatos del archivo
   * @param {Object} metadata - Metadatos del archivo analizado
   * @param {string} fileContent - Contenido del archivo
   * @returns {Promise<Object>} - Prompt configuration
   */
  async generatePrompt(metadata, fileContent) {
    // 1. Detectar tipo de análisis
    const analysisType = this.selector.selectAnalysisType(metadata);
    logger.debug(`Selected analysis type: ${analysisType}`);
    
    // 2. Obtener template
    const template = this.selector.getTemplate(analysisType);
    if (!template) {
      throw new Error(`Template not found for analysis type: ${analysisType}`);
    }
    
    // 3. Resolver schema
    const schema = await this.resolveSchema(analysisType);
    
    // 4. Generar configuración
    const promptConfig = generatePromptConfig(
      template,
      fileContent,
      metadata,
      analysisType,
      schema
    );
    
    // 5. Validar si está habilitado
    if (this.config.validatePrompts) {
      const validation = validatePrompt(promptConfig);
      
      if (!validation.valid && this.config.throwOnValidationError) {
        throw new Error(`Prompt validation failed: ${validation.errors.join(', ')}`);
      }
    }
    
    return promptConfig;
  }
  
  /**
   * Resuelve el schema con cache
   * @param {string} analysisType - Tipo de análisis
   * @returns {Promise<Object>} - Schema
   */
  async resolveSchema(analysisType) {
    // Verificar cache
    if (this.schemaCache.has(analysisType)) {
      return this.schemaCache.get(analysisType);
    }
    
    // Resolver y cachear
    const schema = await resolveSchema(analysisType);
    this.schemaCache.set(analysisType, schema);
    
    return schema;
  }
  
  /**
   * Genera solo el system prompt
   * @param {Object} metadata - Metadatos
   * @returns {Promise<string>} - System prompt
   */
  async generateSystemPromptOnly(metadata) {
    const analysisType = this.selector.selectAnalysisType(metadata);
    const template = this.selector.getTemplate(analysisType);
    
    const { generateSystemPrompt } = await import('./prompt-generator.js');
    return generateSystemPrompt(template, analysisType);
  }
  
  /**
   * Genera solo el user prompt
   * @param {Object} metadata - Metadatos
   * @param {string} fileContent - Contenido
   * @returns {Promise<string>} - User prompt
   */
  async generateUserPromptOnly(metadata, fileContent) {
    const analysisType = this.selector.selectAnalysisType(metadata);
    const template = this.selector.getTemplate(analysisType);
    
    const { generateUserPrompt } = await import('./prompt-generator.js');
    return generateUserPrompt(template, fileContent, metadata);
  }
  
  /**
   * Limpia el cache de schemas
   */
  clearSchemaCache() {
    this.schemaCache.clear();
    logger.debug('Schema cache cleared');
  }
  
  /**
   * Precarga schemas comunes
   * @param {Array<string>} types - Tipos a precargar
   */
  async preloadSchemas(types = ['default', 'semantic-connections']) {
    const { preloadSchemas } = await import('./schema-resolver.js');
    await preloadSchemas(types, this.schemaCache);
  }
  
  /**
   * Obtiene estadísticas del engine
   * @returns {Object} - Estadísticas
   */
  getStats() {
    return {
      cachedSchemas: this.schemaCache.size,
      config: { ...this.config }
    };
  }
}

export default PromptEngine;
