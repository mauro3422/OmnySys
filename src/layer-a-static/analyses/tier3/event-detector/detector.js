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

  const cursor = tree.rootNode.walk();

  function traverse(node) {
    const n = node || tree.rootNode;
    if (n.type === 'call_expression') {
      const property = n.childForFieldName('function');
      const propertyName = property?.childForFieldName('property')?.text || '';
      if (propertyName === 'on' || propertyName === 'once' || propertyName === 'addListener') {
        eventListeners.push({
          event: property?.childForFieldName('arguments')?.namedChild(0)?.text || 'unknown',
          line: n.startPosition.row + 1,
          function: currentFunction
        });
      }
      if (propertyName === 'emit') {
        eventEmitters.push({
          event: property?.childForFieldName('arguments')?.namedChild(0)?.text || 'unknown',
          line: n.startPosition.row + 1,
          function: currentFunction
        });
      }
    }

    for (const child of n.children) {
      traverse(child);
    }
  }

  traverse();
  if (typeof cursor.delete === 'function') cursor.delete();
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


