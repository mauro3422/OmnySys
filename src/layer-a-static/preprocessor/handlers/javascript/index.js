/**
 * @fileoverview JavaScript Handler - Main Class
 * 
 * Clase principal del handler de JavaScript.
 * 
 * @module preprocessor/handlers/javascript/index
 */

import { createRules } from './rules.js';
import { getContextTransitions as getTransitions } from './transitions.js';
import { detectFeatures } from './features.js';

/**
 * JavaScriptContextHandler - Reglas de clasificación para JavaScript
 */
export class JavaScriptContextHandler {
  constructor() {
    /**
     * Placeholder prefix para transformaciones
     * @type {string}
     */
    this.placeholderPrefix = '__OMNY_';
    
    /**
     * Reglas de clasificación para JavaScript
     * @type {Object[]}
     */
    this.rules = createRules(this.placeholderPrefix);
  }
  
  /**
   * Obtiene las reglas de clasificación
   * @returns {Object[]}
   */
  getRules() {
    return this.rules;
  }
  
  /**
   * Determina transiciones de contexto basándose en caracteres/tokens
   * 
   * @param {string} char - Caracter actual
   * @param {Object} lookahead - Información de lookahead
   * @param {ContextModel} context - Modelo de contexto
   * @returns {Array<{action: string, context: string}>} Transiciones a aplicar
   */
  getContextTransitions(char, lookahead, context) {
    return getTransitions(char, lookahead, context);
  }
  
  /**
   * Detecta si el código contiene features que requieren preprocesamiento
   * 
   * @param {string} code - Código a analizar
   * @returns {{ needsPreprocessing: boolean, features: string[] }}
   */
  detectFeatures(code) {
    return detectFeatures(code);
  }
}

export default JavaScriptContextHandler;
