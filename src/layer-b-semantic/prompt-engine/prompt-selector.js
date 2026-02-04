/**
 * Prompt Selector - Selecciona el prompt template basado en metadatos
 */

import dynamicImportsTemplate from './prompt-templates/dynamic-imports.js';
import semanticConnectionsTemplate from './prompt-templates/semantic-connections.js';
import cssInJSTemplate from './prompt-templates/css-in-js.js';
import typescriptTemplate from './prompt-templates/typescript.js';
import defaultTemplate from './prompt-templates/default.js';

class PromptSelector {
  /**
   * Selecciona el tipo de análisis basado en metadatos detectados
   * @param {Object} metadata - Metadatos del archivo
   * @returns {string} Tipo de análisis
   */
  selectAnalysisType(metadata) {
    const { asyncPatterns, localStorageKeys, eventNames, cssInJS, typescript } = metadata;

    // Prioridad 1: Dynamic Imports (lo más crítico para IA)
    if (this.hasDynamicImports(metadata)) {
      return 'dynamic-imports';
    }

    // Prioridad 2: Semantic Connections
    if (this.hasSemanticConnections(metadata)) {
      return 'semantic-connections';
    }

    // Prioridad 3: CSS-in-JS
    if (this.hasCSSInJS(metadata)) {
      return 'css-in-js';
    }

    // Prioridad 4: TypeScript
    if (this.hasTypeScript(metadata)) {
      return 'typescript';
    }

    // Por defecto
    return 'default';
  }

  /**
   * Detecta si el archivo tiene dynamic imports
   */
  hasDynamicImports(metadata) {
    const { asyncPatterns } = metadata;
    
    if (!asyncPatterns || !asyncPatterns.awaitExpressions) {
      return false;
    }

    // Buscar await expressions que contengan import()
    return asyncPatterns.awaitExpressions.some(expr => 
      expr.expression && expr.expression.includes('import(')
    );
  }

  /**
   * Detecta si el archivo tiene conexiones semánticas
   */
  hasSemanticConnections(metadata) {
    const { localStorageKeys, eventNames } = metadata;
    
    return (localStorageKeys && localStorageKeys.length > 0) || 
           (eventNames && eventNames.length > 0);
  }

  /**
   * Detecta si el archivo tiene CSS-in-JS
   */
  hasCSSInJS(metadata) {
    const { cssInJS } = metadata;
    return cssInJS && cssInJS.components && cssInJS.components.length > 0;
  }

  /**
   * Detecta si el archivo tiene TypeScript
   */
  hasTypeScript(metadata) {
    const { typescript } = metadata;
    return typescript && (
      (typescript.interfaces && typescript.interfaces.length > 0) ||
      (typescript.types && typescript.types.length > 0) ||
      (typescript.classes && typescript.classes.length > 0)
    );
  }

  /**
   * Obtiene el template para el tipo de análisis
   */
  getTemplate(analysisType) {
    const templates = {
      'dynamic-imports': dynamicImportsTemplate,
      'semantic-connections': semanticConnectionsTemplate,
      'css-in-js': cssInJSTemplate,
      'typescript': typescriptTemplate,
      'default': defaultTemplate
    };

    let template = templates[analysisType] || templates.default;
    
    // Extraer el template real (handle ES module default export)
    if (template && template.default) {
      template = template.default;
    }
    
    // Validar que el template tenga las propiedades necesarias
    if (!template || !template.systemPrompt || !template.userPrompt) {
      // Si el default también está roto, crear un template básico
      let defaultTmpl = defaultTemplate;
      if (defaultTmpl && defaultTmpl.default) {
        defaultTmpl = defaultTmpl.default;
      }
      
      if (!defaultTmpl || !defaultTmpl.systemPrompt || !defaultTmpl.userPrompt) {
        return {
          systemPrompt: `You are a code analyzer. Return valid JSON.`,
          userPrompt: `<file_content>\n{fileContent}\n</file_content>\n\nANALYZE: Extract patterns, functions, exports, imports. Return exact strings found.`
        };
      }
      return defaultTmpl;
    }
    
    return template;
  }
}

export default new PromptSelector();
