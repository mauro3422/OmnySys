/**
 * Prompt Engine - Single Source of Truth (SSoT)
 * 
 * Sistema centralizado para gestión de prompts dinámicos basados en metadatos.
 * No permite que llm-analyzer.js crezca, todo el prompting está centralizado aquí.
 */

import promptSelector from './prompt-selector.js';
import cognitiveVaccines from './cognitive-vaccines.js';

class PromptEngine {
  constructor() {
    this.selector = promptSelector;
    this.vaccines = cognitiveVaccines;
  }

  /**
   * Genera el prompt completo basado en metadatos del archivo
   * @param {Object} metadata - Metadatos del archivo analizado
   * @param {string} fileContent - Contenido del archivo
   * @returns {Object} Prompt configuration con system prompt, user prompt y schema
   */
  async generatePrompt(metadata, fileContent) {
    // Detectar el tipo de análisis basado en metadatos
    const analysisType = this.selector.selectAnalysisType(metadata);
    
    // Obtener el template específico
    const template = this.selector.getTemplate(analysisType);
    
    // Generar system prompt
    const systemPrompt = this.generateSystemPrompt(template, analysisType);
    
    // Generar user prompt
    const userPrompt = this.generateUserPrompt(template, fileContent, analysisType);
    
    // Obtener JSON schema
    const jsonSchema = await this.getJsonSchema(analysisType);

    return {
      systemPrompt,
      userPrompt,
      jsonSchema,
      analysisType,
      temperature: 0.0, // Siempre 0.0 para extracción
      maxTokens: 2000
    };
  }

  /**
   * Genera el system prompt con cognitive vaccines
   */
  generateSystemPrompt(template, analysisType) {
    const baseRules = this.vaccines.getBaseRules();
    const specificRules = this.vaccines.getSpecificRules(analysisType);
    
    return `${template.systemPrompt}

${baseRules}
${specificRules}

IMPORTANT: Return ONLY valid JSON with ALL required fields. If not found, return empty arrays.`;
  }

  /**
   * Genera el user prompt con el contenido del archivo
   */
  generateUserPrompt(template, fileContent, analysisType) {
    if (!template) {
      throw new Error(`Template for ${analysisType} is null or undefined`);
    }
    
    if (!template.userPrompt) {
      throw new Error(`Template for ${analysisType} is missing userPrompt. Template keys: ${Object.keys(template).join(', ')}`);
    }
    
    return template.userPrompt.replace('{fileContent}', fileContent);
  }

  /**
   * Obtiene el JSON schema para validación
   */
  async getJsonSchema(analysisType) {
    const schemas = {
      'dynamic-imports': './json-schemas/dynamic-imports.json',
      'semantic-connections': './json-schemas/semantic-connections.json',
      'css-in-js': './json-schemas/css-in-js.json',
      'typescript': './json-schemas/typescript.json',
      'default': './json-schemas/default.json'
    };

    const schemaPath = schemas[analysisType] || schemas.default;
    
    try {
      const schemaModule = await import(schemaPath, { assert: { type: 'json' } });
      return schemaModule.default || schemaModule;
    } catch (error) {
      console.warn(`Warning: Could not load schema for ${analysisType}, using default`);
      try {
        const defaultModule = await import('./json-schemas/default.json', { assert: { type: 'json' } });
        return defaultModule.default || defaultModule;
      } catch (defaultError) {
        console.warn('Warning: Could not load default schema, using empty schema');
        return {};
      }
    }
  }

  /**
   * Valida que el prompt generado sea correcto
   */
  validatePrompt(promptConfig) {
    const required = ['systemPrompt', 'userPrompt', 'jsonSchema', 'analysisType'];
    const missing = required.filter(key => !promptConfig[key]);
    
    if (missing.length > 0) {
      throw new Error(`Prompt validation failed. Missing: ${missing.join(', ')}`);
    }

    if (!promptConfig.systemPrompt.includes('Return ONLY valid JSON')) {
      throw new Error('System prompt must include JSON validation rules');
    }

    return true;
  }
}

export default new PromptEngine();
