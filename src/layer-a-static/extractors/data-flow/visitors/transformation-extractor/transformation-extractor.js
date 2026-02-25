/**
 * @fileoverview Transformation Extractor
 * 
 * Extrae transformaciones de datos de funciones.
 * Versión 2.0: Refactorizado en módulos especializados.
 * 
 * @module transformation-extractor/transformation-extractor
 * @version 2.0.0
 */

import { createLogger } from '#utils/logger.js';
import { text, startLine, findFunctionNode } from '../../utils/ts-ast-utils.js';
import { classifyOperation } from './core/operation-classifier.js';
import { extractSources } from './core/source-extractor.js';
import { processStatement, createProcessingContext } from './processors/statement-processor.js';
import { processVariableDeclaration } from './processors/variable-processor.js';
import { processExpressionStatement, processImplicitReturn } from './processors/expression-processor.js';
import { handleDestructuring } from './handlers/destructuring-handler.js';
import { handleMutatingCall } from './handlers/mutation-handler.js';

const logger = createLogger('OmnySys:data-flow:transformation-extractor');

/**
 * Transformation Extractor v2.0
 * 
 * Extrae transformaciones de data flow de funciones JavaScript.
 */
export class TransformationExtractor {
  /**
   * @param {string} functionCode - Código de la función
   * @param {Array} inputs - Inputs detectados
   */
  constructor(functionCode, inputs) {
    this.code = functionCode;
    this.inputs = inputs || [];
    this.transformations = [];
    this.inputNames = new Set(this.inputs.map(i => i.name));

    // Trackear nombres locales de destructured inputs
    this.inputs.forEach(i => {
      if (i.properties) {
        i.properties.forEach(p => this.inputNames.add(p.local));
      }
    });

    this.definedVariables = new Set();
  }

  /**
   * Extrae todas las transformaciones del AST
   * @param {Object} functionAst - AST de la función
   * @returns {Array} - Lista de transformaciones
   */
  extract(functionAst) {
    try {
      const functionNode = findFunctionNode(functionAst);
      if (!functionNode) {
        logger.debug('No function node found in AST');
        return [];
      }

      const body = functionNode.childForFieldName('body');
      if (!body) {
        logger.debug('Function has no body');
        return [];
      }

      // Arrow function con expresión implícita: x => x + 1 (en Tree-sitter no es un bloque)
      if (body.type !== 'statement_block') {
        processImplicitReturn(body, {
          addTransformation: this.addTransformation.bind(this),
          code: this.code
        });
        return this.transformations;
      }

      // Procesar cada statement del cuerpo
      const statements = body.namedChildren || [];
      for (const stmt of statements) {
        this.processStatement(stmt);
      }

      return this.transformations;

    } catch (error) {
      logger.warn(`Error extracting transformations: ${error.message}`);
      return [];
    }
  }

  /**
   * Procesa un statement delegando al processor apropiado
   * @private
   */
  processStatement(stmt) {
    const context = createProcessingContext({
      variable: (s) => processVariableDeclaration(s, {
        extractTransformation: this.extractTransformation.bind(this),
        addTransformation: this.addTransformation.bind(this),
        trackVariable: this.trackVariable.bind(this)
      }),
      expression: (s) => processExpressionStatement(s, {
        extractTransformation: this.extractTransformation.bind(this),
        addTransformation: this.addTransformation.bind(this),
        trackVariable: this.trackVariable.bind(this)
      }),
      ifStatement: (s) => this.processIfStatement(s),
      tryStatement: (s) => this.processTryStatement(s),
      loop: (s) => this.processLoop(s),
      block: (s) => this.processBlock(s),
      switch: (s) => this.processSwitchStatement(s)
    });

    processStatement(stmt, context.handlers);
  }

  /**
   * Procesa if statement
   * @private
   */
  processIfStatement(stmt) {
    if (stmt.consequent) {
      this.processStatement(stmt.consequent);
    }
    if (stmt.alternate) {
      this.processStatement(stmt.alternate);
    }
  }

  /**
   * Procesa try-catch-finally
   * @private
   */
  processTryStatement(stmt) {
    this.processStatement(stmt.block);
    if (stmt.handler?.body) {
      this.processStatement(stmt.handler.body);
    }
    if (stmt.finalizer) {
      this.processStatement(stmt.finalizer);
    }
  }

  /**
   * Procesa loops
   * @private
   */
  processLoop(loop) {
    this.processStatement(loop.body);
  }

  /**
   * Procesa bloques
   * @private
   */
  processBlock(block) {
    const statements = block.body || [];
    for (const stmt of statements) {
      this.processStatement(stmt);
    }
  }

  /**
   * Procesa switch statements
   * @private
   */
  processSwitchStatement(stmt) {
    for (const case_ of stmt.cases || []) {
      for (const consequent of case_.consequent) {
        this.processStatement(consequent);
      }
    }
  }

  /**
   * Extrae una transformación y la agrega
   * @private
   */
  extractTransformation(targetVar, sourceNode, meta = {}) {
    const sources = extractSources(sourceNode, this.code);
    const operation = classifyOperation(sourceNode, this.code);

    this.addTransformation({
      to: targetVar,
      from: sources.length === 1 ? sources[0] : sources,
      operation: operation.type,
      operationDetails: operation.details,
      via: operation.via,
      line: meta.line || startLine(sourceNode),
      ...meta
    });

    this.trackVariable(targetVar);
  }

  /**
   * Agrega una transformación a la lista
   * @private
   */
  addTransformation(transformation) {
    this.transformations.push(transformation);
  }

  /**
   * Trackea una variable definida
   * @private
   */
  trackVariable(name) {
    this.definedVariables.add(name);
  }

  /**
   * Obtiene las transformaciones extraídas
   * @returns {Array} - Transformaciones
   */
  getTransformations() {
    return [...this.transformations];
  }

  /**
   * Obtiene variables definidas
   * @returns {Set} - Variables definidas
   */
  getDefinedVariables() {
    return new Set(this.definedVariables);
  }

  /**
   * Verifica si una variable es input
   * @param {string} name - Nombre de variable
   * @returns {boolean} - True si es input
   */
  isInput(name) {
    return this.inputNames.has(name);
  }
}

export default TransformationExtractor;
