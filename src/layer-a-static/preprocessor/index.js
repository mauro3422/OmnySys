/**
 * @fileoverview Omny Preprocessor Framework
 * 
 * Sistema de pre-procesamiento contextual para resolver ambigüedades
 * léxicas antes del parseo. Diseñado para ser extensible a múltiples
 * lenguajes.
 * 
 * Caso de uso principal: Resolver conflicto de # en JavaScript
 * - # como shebang (#!/usr/bin/env node)
 * - # como private field (#field)
 * - # como pipeline topic token (|> f(#))
 * 
 * @module preprocessor
 * @version 1.0.0
 */

export { ContextModel, CONTEXTS } from './context-model.js';
export { TokenClassifier } from './token-classifier.js';
export { PreprocessorEngine } from './engine.js';
export { JavaScriptContextHandler } from './handlers/javascript.js';
export { TypeScriptContextHandler } from './handlers/typescript.js';

import { PreprocessorEngine } from './engine.js';

/**
 * Factory para crear un preprocesador configurado
 * @param {string} language - 'javascript' | 'typescript' | 'python' | 'go'
 * @param {object} options - Opciones de configuración
 * @returns {PreprocessorEngine}
 */
export function createPreprocessor(language = 'javascript', options = {}) {
  return new PreprocessorEngine(language, options);
}

/**
 * Pre-procesa código JavaScript/TypeScript
 * Función de conveniencia para uso directo
 * 
 * @param {string} code - Código fuente
 * @param {object} options - Opciones
 * @returns {{ code: string, transformations: array, warnings: array }}
 */
export function preprocessJavaScript(code, options = {}) {
  const engine = new PreprocessorEngine('javascript', options);
  return engine.preprocess(code, options);
}

export default {
  ContextModel,
  TokenClassifier,
  PreprocessorEngine,
  JavaScriptContextHandler,
  TypeScriptContextHandler,
  createPreprocessor,
  preprocessJavaScript
};