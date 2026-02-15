/**
 * @fileoverview consumer-detector.js
 * 
 * Detecta consumers de React Context (useContext, Context.Consumer)
 * 
 * @module extractors/state-management/context/consumer-detector
 */

import { CONTEXT_PATTERNS, ContextType } from '../constants.js';
import { getLineNumber } from '../utils.js';

/**
 * Detecta uso de useContext hook
 * @param {string} code - Código fuente
 * @returns {Array} - Consumos detectados
 */
export function detectUseContext(code) {
  const consumers = [];
  let match;
  
  CONTEXT_PATTERNS.useContext.lastIndex = 0;
  while ((match = CONTEXT_PATTERNS.useContext.exec(code)) !== null) {
    consumers.push({
      type: ContextType.USE_CONTEXT,
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return consumers;
}

/**
 * Detecta uso de Context.Consumer
 * @param {string} code - Código fuente
 * @returns {Array} - Consumers detectados
 */
export function detectContextConsumers(code) {
  const consumers = [];
  let match;
  
  CONTEXT_PATTERNS.consumer.lastIndex = 0;
  while ((match = CONTEXT_PATTERNS.consumer.exec(code)) !== null) {
    consumers.push({
      type: ContextType.CONTEXT_CONSUMER,
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return consumers;
}

/**
 * Detecta uso de use(Context) - React 18+
 * @param {string} code - Código fuente
 * @returns {Array} - Consumos detectados
 */
export function detectUseContextNew(code) {
  const consumers = [];
  let match;
  
  CONTEXT_PATTERNS.useContextNew.lastIndex = 0;
  while ((match = CONTEXT_PATTERNS.useContextNew.exec(code)) !== null) {
    consumers.push({
      type: ContextType.USE_CONTEXT_NEW,
      contextName: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return consumers;
}

/**
 * Detecta todos los consumers
 * @param {string} code - Código fuente
 * @returns {Array} - Todos los consumers
 */
export function detectAllConsumers(code) {
  return [
    ...detectUseContext(code),
    ...detectContextConsumers(code),
    ...detectUseContextNew(code)
  ];
}
