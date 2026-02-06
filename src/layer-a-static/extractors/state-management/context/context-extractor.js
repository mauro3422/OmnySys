/**
 * @fileoverview context-extractor.js
 * 
 * Extrae información completa de React Context
 * 
 * @module extractors/state-management/context/context-extractor
 */

import { detectAllProviders } from './provider-detector.js';
import { detectAllConsumers } from './consumer-detector.js';

/**
 * Extrae información de React Context
 * @param {string} code - Código fuente
 * @returns {Object} - { contexts: [], providers: [], consumers: [], all: [] }
 */
export function extractContext(code) {
  const { contexts, providers } = detectAllProviders(code);
  const consumers = detectAllConsumers(code);
  
  return {
    contexts,
    providers,
    consumers,
    all: [...contexts, ...providers, ...consumers]
  };
}

/**
 * Extrae solo contextos creados
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractContexts(code) {
  const { contexts } = detectAllProviders(code);
  return contexts;
}

/**
 * Extrae solo providers
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractProviders(code) {
  const { providers } = detectAllProviders(code);
  return providers;
}

/**
 * Extrae solo consumers
 * @param {string} code - Código fuente
 * @returns {Array}
 */
export function extractConsumers(code) {
  return detectAllConsumers(code);
}
