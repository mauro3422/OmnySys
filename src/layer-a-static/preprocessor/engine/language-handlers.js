/**
 * @fileoverview Language Handlers Configuration
 * Configuration for language-specific handlers
 * 
 * @module preprocessor/engine/language-handlers
 */

import { JavaScriptContextHandler } from '../handlers/javascript.js';
import { TypeScriptContextHandler } from '../handlers/typescript.js';

/**
 * Available handlers by language
 */
export const LANGUAGE_HANDLERS = {
  javascript: JavaScriptContextHandler,
  typescript: TypeScriptContextHandler,
  js: JavaScriptContextHandler,
  ts: TypeScriptContextHandler
};

/**
 * Creates appropriate handler for language
 * @param {string} language - Language identifier
 * @returns {Object} Handler instance
 * @throws {Error} If language not supported
 */
export function createHandler(language) {
  const HandlerClass = LANGUAGE_HANDLERS[language.toLowerCase()];
  if (!HandlerClass) {
    throw new Error(`Lenguaje no soportado: ${language}. Disponibles: ${Object.keys(LANGUAGE_HANDLERS).join(', ')}`);
  }
  return new HandlerClass();
}

/**
 * Checks if language is supported
 * @param {string} language - Language identifier
 * @returns {boolean}
 */
export function isLanguageSupported(language) {
  return language.toLowerCase() in LANGUAGE_HANDLERS;
}

/**
 * Gets list of supported languages
 * @returns {string[]}
 */
export function getSupportedLanguages() {
  return Object.keys(LANGUAGE_HANDLERS);
}
