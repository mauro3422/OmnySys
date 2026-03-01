/**
 * @fileoverview detector.js
 * 
 * Detector de patrones de eventos usando AST
 * 
 * @module analyses/tier3/event-detector/detector
 */

import { parseCodeToAST } from './parser.js';
import { EVENT_PATTERNS } from './constants.js';
import { extractEventName, getConfidence, getObjectName, getMethodName, isMethodCall } from './ast-utils.js';
import { startLine, text } from '../../../extractors/data-flow/utils/ts-ast-utils.js';

const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
];

/**
 * Detecta patrones de eventos en un archivo usando Tree-sitter
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<object>} - { eventListeners: [], eventEmitters: [] }
 */
export async function detectEventPatterns(code, filePath = '') {
  const eventListeners = [];
  const eventEmitters = [];

  const tree = await parseCodeToAST(code, filePath);
  if (!tree) {
    return { eventListeners, eventEmitters };
  }

  let currentFunction = 'module-level';

  function walk(node) {
    // Rastrear contexto de función
    let isFunction = FUNCTION_NODE_TYPES.includes(node.type);
    let oldContext = currentFunction;

    if (isFunction) {
      const nameNode = node.childForFieldName('name');
      currentFunction = nameNode ? text(nameNode, code) : 'anonymous';
    }

    // Detectar llamadas a métodos de eventos
    if (isMethodCall(node)) {
      const functionNode = node.childForFieldName('function');
      const methodName = getMethodName(functionNode, code);
      const objectName = getObjectName(functionNode, code);

      const argsNode = node.childForFieldName('arguments');
      const namedArgs = argsNode ? argsNode.namedChildren : [];
      const firstArg = namedArgs[0];

      if (firstArg) {
        const eventName = extractEventName(firstArg, code);

        if (eventName) {
          // Buscar listeners
          if (EVENT_PATTERNS.listeners.includes(methodName)) {
            eventListeners.push({
              filePath,
              line: startLine(node),
              column: node.startPosition.column,
              functionContext: currentFunction,
              eventName,
              pattern: methodName,
              objectName,
              confidence: getConfidence(firstArg),
              handlerLine: startLine(node)
            });
          }

          // Buscar emitters
          if (EVENT_PATTERNS.emitters.includes(methodName)) {
            eventEmitters.push({
              filePath,
              line: startLine(node),
              column: node.startPosition.column,
              functionContext: currentFunction,
              eventName,
              pattern: methodName,
              objectName,
              confidence: getConfidence(firstArg),
              dataLine: startLine(node)
            });
          }
        }
      }
    }

    for (const child of node.namedChildren) {
      walk(child);
    }

    if (isFunction) {
      currentFunction = oldContext;
    }
  }

  walk(tree.rootNode);
  // node-tree-sitter no requiere tree.delete(), GC se encarga

  return { eventListeners, eventEmitters };
}

/**
 * Detecta solo listeners
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Array>}
 */
export async function detectListeners(code, filePath = '') {
  const { eventListeners } = await detectEventPatterns(code, filePath);
  return eventListeners;
}

/**
 * Detecta solo emitters
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Array>}
 */
export async function detectEmitters(code, filePath = '') {
  const { eventEmitters } = await detectEventPatterns(code, filePath);
  return eventEmitters;
}

export default {
  detectEventPatterns,
  detectListeners,
  detectEmitters
};
