/**
 * @fileoverview OutputExtractor Class
 * 
 * Clase principal que extrae outputs de funciones.
 * 
 * @module data-flow/output-extractor/OutputExtractor
 * @version 2.0.0
 */

import { createLogger } from '#utils/logger.js';
import { findFunctionNode, startLine } from '../../utils/ts-ast-utils.js';
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

      const body = functionNode.childForFieldName('body');
      if (!body) return [];

      // Arrow function con expresión directa (en Tree-sitter no es un bloque)
      if (body.type !== 'statement_block') {
        this.outputs.push(extractImplicitReturn(body, this.code));
        this.hasReturn = true;
        return this.outputs;
      }

      // Procesar statements
      const state = {
        outputs: this.outputs,
        hasReturn: false,
        hasSideEffect: false,
        code: this.code
      };

      const handlers = {
        onReturn: (stmt) => extractReturn(stmt, this.code),
        onThrow: (stmt) => extractThrow(stmt, this.code),
        onSideEffect: (expr) => extractSideEffect(expr, this.code)
      };

      processStatements(body.namedChildren || [], handlers, state);

      this.hasReturn = state.hasReturn;
      this.hasSideEffect = state.hasSideEffect;

      // Si no hay return explícito, es undefined
      if (!this.hasReturn) {
        this.outputs.push(createUndefinedReturn(startLine(functionNode)));
      }

      return this.outputs;

    } catch (error) {
      logger.warn(`Error extracting outputs: ${error.message}`);
      return [];
    }
  }
}

export default OutputExtractor;
