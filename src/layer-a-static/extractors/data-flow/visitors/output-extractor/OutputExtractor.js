/**
 * @fileoverview OutputExtractor Class
 * 
 * Clase principal que extrae outputs de funciones.
 * 
 * @module data-flow/output-extractor/OutputExtractor
 * @version 2.0.0
 */

import { createLogger } from '../../../../utils/logger.js';
import { findFunctionNode } from './helpers/ast-helpers.js';
import { extractReturn, extractImplicitReturn, createUndefinedReturn } from './extractors/return-extractor.js';
import { extractThrow } from './extractors/throw-extractor.js';
import { extractSideEffect } from './extractors/side-effect-extractor.js';
import { processStatements } from './processors/statement-processor.js';

const logger = createLogger('OmnySys:data-flow:output-extractor');

/**
 * Extrae outputs de una función (returns, throws, side effects)
 */
export class OutputExtractor {
  constructor(functionCode, transformations) {
    this.code = functionCode;
    this.transformations = transformations || [];
    this.outputs = [];
    this.hasReturn = false;
    this.hasSideEffect = false;
  }

  /**
   * Extrae todos los outputs de la función
   * @param {Object} functionAst - AST de la función
   * @returns {Array} Lista de outputs
   */
  extract(functionAst) {
    try {
      const functionNode = findFunctionNode(functionAst);
      if (!functionNode) return [];

      const body = functionNode.body;
      if (!body) return [];

      // Arrow function con expresión directa
      if (body.type !== 'BlockStatement') {
        this.outputs.push(extractImplicitReturn(body));
        this.hasReturn = true;
        return this.outputs;
      }

      // Procesar statements
      const state = {
        outputs: this.outputs,
        hasReturn: false,
        hasSideEffect: false
      };

      const handlers = {
        onReturn: (stmt) => extractReturn(stmt),
        onThrow: (stmt) => extractThrow(stmt),
        onSideEffect: (expr) => extractSideEffect(expr)
      };

      processStatements(body.body || [], handlers, state);

      this.hasReturn = state.hasReturn;
      this.hasSideEffect = state.hasSideEffect;

      // Si no hay return explícito, es undefined
      if (!this.hasReturn) {
        this.outputs.push(createUndefinedReturn(functionNode.loc?.end?.line));
      }

      return this.outputs;

    } catch (error) {
      logger.warn(`Error extracting outputs: ${error.message}`);
      return [];
    }
  }
}

export default OutputExtractor;
