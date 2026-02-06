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
    const userPrompt = this.generateUserPrompt(template, fileContent, metadata, analysisType);
    
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
   * Genera el user prompt con el contenido del archivo y metadatos
   */
  generateUserPrompt(template, fileContent, metadata, analysisType) {
    if (!template) {
      throw new Error(`Template for ${analysisType} is null or undefined`);
    }
    
    if (!template.userPrompt) {
      throw new Error(`Template for ${analysisType} is missing userPrompt. Template keys: ${Object.keys(template).join(', ')}`);
    }

    const fileContentPlaceholder = '__OMNY_FILE_CONTENT__';

    // Helpers to avoid empty metadata lines (token savings)
    const listToString = (value) => {
      if (!Array.isArray(value) || value.length === 0) return '';
      return value.join(', ');
    };
    const formatSemanticConnections = (value) => {
      if (!Array.isArray(value) || value.length === 0) return '';
      return JSON.stringify(value).slice(0, 200);
    };
    const compactMetadataBlock = (text) => {
      const lines = text.split(/\r?\n/);
      const compacted = [];

      for (let line of lines) {
        // Remove empty trailing parentheses, e.g. "EXPORTS: 0 ()"
        line = line.replace(/\s*\(\s*\)\s*$/, '');

        // Remove lines with empty values: "KEY: " or "KEY: []" or "KEY: {}"
        const match = line.match(/^\s*[^:]+:\s*(.*)\s*$/);
        if (match) {
          const value = (match[1] || '').trim();
          if (value === '' || value === '[]' || value === '{}' || value === 'false') {
            continue;
          }
        }

        compacted.push(line);
      }

      return compacted.join('\n');
    };
    
    // Reemplazar todas las variables del template con los metadatos
    let userPrompt = template.userPrompt;
    const placeholders = new Set(template.userPrompt.match(/\{[a-zA-Z0-9_]+\}/g) || []);
    
    // Variables básicas siempre disponibles
    const replacements = {
      '{filePath}': metadata.filePath || 'unknown',
      '{fileContent}': fileContentPlaceholder,
      '{exportCount}': metadata.exportCount || 0,
      '{dependentCount}': metadata.dependentCount || 0,
      '{importCount}': metadata.importCount || 0,
      '{functionCount}': metadata.functionCount || 0,
      '{exports}': listToString(metadata.exports),
      '{dependents}': listToString(metadata.dependents),
      '{hasDynamicImports}': metadata.hasDynamicImports || false,
      '{hasTypeScript}': metadata.hasTypeScript || false,
      '{hasCSSInJS}': metadata.hasCSSInJS || false,
      '{hasLocalStorage}': metadata.hasLocalStorage || false,
      '{hasEventListeners}': metadata.hasEventListeners || false,
      '{hasGlobalAccess}': metadata.hasGlobalAccess || false,
      '{hasAsyncPatterns}': metadata.hasAsyncPatterns || false,
      '{hasJSDoc}': metadata.hasJSDoc || false,
      '{hasSingletonPattern}': metadata.hasSingletonPattern || false,
      '{localStorageKeys}': listToString(metadata.localStorageKeys),
      '{eventNames}': listToString(metadata.eventNames),
      '{envVars}': listToString(metadata.envVars),
      // NUEVO: Variables semánticas críticas
      '{semanticDependentCount}': metadata.semanticDependentCount || 0,
      '{definesGlobalState}': metadata.definesGlobalState || false,
      '{usesGlobalState}': metadata.usesGlobalState || false,
      '{globalStateWrites}': listToString(metadata.globalStateWrites),
      '{globalStateReads}': listToString(metadata.globalStateReads),
      '{hasEventEmitters}': metadata.hasEventEmitters || false,
      '{semanticConnections}': formatSemanticConnections(metadata.semanticConnections)
    };

    const filteredReplacements = {};
    for (const placeholder of placeholders) {
      filteredReplacements[placeholder] = Object.prototype.hasOwnProperty.call(replacements, placeholder)
        ? replacements[placeholder]
        : '';
    }
    
    // Reemplazar todas las variables
    for (const [key, value] of Object.entries(filteredReplacements)) {
      userPrompt = userPrompt.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Compact only the metadata section (before the code)
    if (userPrompt.includes(fileContentPlaceholder)) {
      const parts = userPrompt.split(fileContentPlaceholder);
      const before = parts.shift() || '';
      const after = parts.join(fileContentPlaceholder);
      userPrompt = `${compactMetadataBlock(before)}${fileContentPlaceholder}${after}`;
    } else {
      userPrompt = compactMetadataBlock(userPrompt);
    }

    // Reinsert real file content
    userPrompt = userPrompt.replace(fileContentPlaceholder, fileContent || '');

    return userPrompt;
  }

  /**
   * Obtiene el JSON schema para validación
   */
  async getJsonSchema(analysisType) {
    const schemas = {
      'dynamic-imports': 'dynamic-imports.json',
      'semantic-connections': 'semantic-connections.json',
      'css-in-js': 'css-in-js.json',
      'typescript': 'typescript.json',
      'default': 'default.json'
    };

    const candidates = [];
    const safeType = typeof analysisType === 'string' && /^[a-z0-9-]+$/i.test(analysisType)
      ? analysisType
      : null;

    if (safeType) {
      candidates.push(`${safeType}.json`);
    }
    if (schemas[analysisType]) {
      candidates.push(schemas[analysisType]);
    }
    candidates.push(schemas.default);

    for (const schemaFile of candidates) {
      try {
        const schemaUrl = new URL(`./json-schemas/${schemaFile}`, import.meta.url);
        const schemaModule = await import(schemaUrl, { assert: { type: 'json' } });
        return schemaModule.default || schemaModule;
      } catch {
        // Try next candidate
      }
    }

    return {};
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
