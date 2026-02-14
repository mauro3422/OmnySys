/**
 * @fileoverview Error Flow Extractor
 * 
 * Función principal de extracción de flujo de errores.
 * 
 * @module error-flow/extractors/error-flow-extractor
 * @version 2.0.0
 */

import { createLogger } from '../../../../utils/logger.js';
import { extractThrows } from './throw-extractor.js';
import { extractCatches, extractTryBlocks } from './catch-extractor.js';
import { detectPropagationPattern, detectUnhandledCalls } from '../analyzers/propagation-analyzer.js';

const logger = createLogger('OmnySys:extractors:error-flow');

export function extractErrorFlow(code, typeContracts = {}) {
  const errorFlow = {
    throws: [],
    catches: [],
    tryBlocks: [],
    unhandledCalls: [],
    propagation: 'none'
  };
  
  try {
    errorFlow.throws = extractThrows(code, typeContracts);
    errorFlow.catches = extractCatches(code);
    errorFlow.tryBlocks = extractTryBlocks(code);
    errorFlow.propagation = detectPropagationPattern(code);
    errorFlow.unhandledCalls = detectUnhandledCalls(code);
  } catch (error) {
    logger.warn('Failed to extract error flow:', error.message);
  }
  
  return errorFlow;
}

export default { extractErrorFlow };
