/**
 * @fileoverview InputExtractor Class
 * 
 * Clase principal orquestadora de extracción de inputs.
 * 
 * @module data-flow/input-extractor/InputExtractor
 * @version 2.0.0
 */

import { createLogger } from '../../../../utils/logger.js';
import { findFunctionNode } from './helpers/ast-helpers.js';
import { extractParameters } from './extractors/param-extractor.js';
import { findUsages } from './analyzers/usage-analyzer.js';

const logger = createLogger('OmnySys:data-flow:input-extractor');

/**
 * Extrae inputs (parámetros) de funciones
 */
export class InputExtractor {
  constructor(functionCode, functionName) {
    this.code = functionCode;
    this.functionName = functionName;
  }

  /**
   * Extrae todos los inputs del AST de la función
   * @param {Object} functionAst - AST de la función
   * @returns {Array} Lista de inputs con sus usos
   */
  extract(functionAst) {
    try {
      const functionNode = this.findFunctionNodeSafe(functionAst);
      if (!functionNode) {
        return [];
      }

      const inputs = this.extractParametersSafe(functionNode);
      if (inputs.length === 0) {
        return [];
      }

      const usages = this.findUsagesSafe(functionNode, inputs);
      return this.buildInputsWithUsages(inputs, usages);

    } catch (error) {
      logger.warn(`Error extracting inputs for ${this.functionName}: ${error.message}`);
      return [];
    }
  }

  findFunctionNodeSafe(ast) {
    try {
      return findFunctionNode(ast);
    } catch (e) {
      logger.warn(`[DIAG] findFunctionNode failed for ${this.functionName}: ${e.message}`);
      return null;
    }
  }

  extractParametersSafe(functionNode) {
    try {
      const params = Array.isArray(functionNode.params) ? functionNode.params : [];
      return extractParameters(params);
    } catch (e) {
      logger.warn(`[DIAG] extractParameters failed for ${this.functionName}: ${e.message}`);
      return [];
    }
  }

  findUsagesSafe(functionNode, inputs) {
    try {
      return findUsages(functionNode, inputs);
    } catch (e) {
      logger.warn(`[DIAG] findUsages failed for ${this.functionName}: ${e.message}`);
      // Retornar mapa vacío para que al menos tengamos los inputs
      const emptyUsages = new Map();
      for (const input of inputs) {
        emptyUsages.set(input.name, []);
      }
      return emptyUsages;
    }
  }

  buildInputsWithUsages(inputs, usages) {
    return inputs.map(input => ({
      ...input,
      usages: usages.get(input.name) || []
    }));
  }
}

export default InputExtractor;
