/**
 * @fileoverview detector.js
 * 
 * Detector de patrones de eventos usando AST
 * 
 * @module analyses/tier3/event-detector/detector
 */

import traverse from '@babel/traverse';
import { parseCodeToAST } from './parser.js';
import { EVENT_PATTERNS } from './constants.js';
import { extractEventName, getConfidence, getObjectName, getMethodName, isMethodCall } from './ast-utils.js';

/**
 * Detecta patrones de eventos en un archivo
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {object} - { eventListeners: [], eventEmitters: [] }
 */
export function detectEventPatterns(code, filePath = '') {
  const eventListeners = [];
  const eventEmitters = [];

  const ast = parseCodeToAST(code, filePath);
  if (!ast) {
    return { eventListeners, eventEmitters };
  }

  let currentFunction = 'module-level';

  traverse.default(ast, {
    FunctionDeclaration(nodePath) {
      currentFunction = nodePath.node.id?.name || 'anonymous-function';
    },
    ArrowFunctionExpression(nodePath) {
      currentFunction = nodePath.node.id?.name || 'anonymous-arrow';
    },

    CallExpression(nodePath) {
      const node = nodePath.node;
      
      if (!isMethodCall(node)) return;

      const methodName = getMethodName(node.callee);
      const objectName = getObjectName(node.callee);

      // Buscar listeners
      if (EVENT_PATTERNS.listeners.includes(methodName)) {
        const eventName = extractEventName(node.arguments[0]);

        if (eventName) {
          eventListeners.push({
            filePath,
            line: node.loc?.start?.line || 0,
            column: node.loc?.start?.column || 0,
            functionContext: currentFunction,
            eventName,
            pattern: methodName,
            objectName,
            confidence: getConfidence(node.arguments[0]),
            handlerLine: node.loc?.start?.line || 0
          });
        }
      }

      // Buscar emitters
      if (EVENT_PATTERNS.emitters.includes(methodName)) {
        const eventName = extractEventName(node.arguments[0]);

        if (eventName) {
          eventEmitters.push({
            filePath,
            line: node.loc?.start?.line || 0,
            column: node.loc?.start?.column || 0,
            functionContext: currentFunction,
            eventName,
            pattern: methodName,
            objectName,
            confidence: getConfidence(node.arguments[0]),
            dataLine: node.loc?.start?.line || 0
          });
        }
      }
    }
  });

  return { eventListeners, eventEmitters };
}

/**
 * Detecta solo listeners
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array}
 */
export function detectListeners(code, filePath = '') {
  const { eventListeners } = detectEventPatterns(code, filePath);
  return eventListeners;
}

/**
 * Detecta solo emitters
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array}
 */
export function detectEmitters(code, filePath = '') {
  const { eventEmitters } = detectEventPatterns(code, filePath);
  return eventEmitters;
}
