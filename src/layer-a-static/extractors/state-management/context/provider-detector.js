/**
 * @fileoverview provider-detector.js
 * 
 * Detecta providers de React Context
 * 
 * @module extractors/state-management/context/provider-detector
 */

import { CONTEXT_PATTERNS, ContextType } from '../constants.js';
import { getLineNumber } from '../utils.js';

/**
 * Detecta creación de contextos (createContext)
 * @param {string} code - Código fuente
 * @returns {Array} - Contextos creados
 */
export function detectContextCreations(code) {
  const contexts = [];
  let match;
  
  CONTEXT_PATTERNS.createContext.lastIndex = 0;
  while ((match = CONTEXT_PATTERNS.createContext.exec(code)) !== null) {
    contexts.push({
      type: ContextType.CONTEXT_CREATION,
      line: getLineNumber(code, match.index)
    });
  }
  
  return contexts;
}

/**
 * Detecta uso de Context.Provider
 * @param {string} code - Código fuente
 * @returns {Array} - Providers detectados
 */
export function detectProviders(code) {
  const providers = [];
  let match;
  
  CONTEXT_PATTERNS.provider.lastIndex = 0;
  while ((match = CONTEXT_PATTERNS.provider.exec(code)) !== null) {
    providers.push({
      type: ContextType.CONTEXT_PROVIDER,
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return providers;
}

/**
 * Detecta creaciones y providers
 * @param {string} code - Código fuente
 * @returns {Object} - { contexts: [], providers: [] }
 */
export function detectAllProviders(code) {
  return {
    contexts: detectContextCreations(code),
    providers: detectProviders(code)
  };
}
