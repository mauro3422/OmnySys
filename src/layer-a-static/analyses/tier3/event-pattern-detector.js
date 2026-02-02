/**
 * Event Pattern Detector - Detecta event emitters y listeners
 *
 * Responsabilidad:
 * - Encontrar llamadas a .on(), .off(), .emit(), .addEventListener(), etc.
 * - Extraer nombres de eventos
 * - Matchear emitters con listeners
 * - Generar conexiones semánticas
 *
 * @module event-pattern-detector
 */

import traverse from '@babel/traverse';
import { parse } from '@babel/parser';

const EVENT_PATTERNS = {
  listeners: ['on', 'addEventListener', 'once', 'subscribe'],
  emitters: ['emit', 'dispatchEvent', 'trigger', 'publish'],
  removers: ['off', 'removeEventListener', 'unsubscribe']
};

/**
 * Detecta patrones de eventos en un archivo
 *
 * @param {string} code - Código fuente del archivo
 * @param {string} filePath - Ruta del archivo para debugging
 * @returns {object} - { eventListeners: [], eventEmitters: [] }
 */
export function detectEventPatterns(code, filePath = '') {
  const eventListeners = [];
  const eventEmitters = [];

  try {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const plugins = [
      'jsx',
      'objectRestSpread',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      ['pipelineOperator', { proposal: 'minimal' }],
      'nullishCoalescingOperator',
      'optionalChaining',
      'partialApplication'
    ];

    if (isTypeScript) {
      plugins.push(['typescript', { isTSX: filePath.endsWith('.tsx') }]);
    }

    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });

    let currentFunction = 'module-level';

    traverse.default(ast, {
      FunctionDeclaration(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-function';
      },
      ArrowFunctionExpression(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-arrow';
      },

      // Detectar llamadas a métodos
      CallExpression(nodePath) {
        const node = nodePath.node;
        const callee = node.callee;

        // Verificar si es una llamada a método (obj.method(...))
        if (callee.type === 'MemberExpression' && callee.property.name) {
          const methodName = callee.property.name;
          const objectName = callee.object.name || callee.object?.object?.name;

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
      }
    });
  } catch (error) {
    console.warn(`⚠️  Error parsing ${filePath}:`, error.message);
  }

  return {
    eventListeners,
    eventEmitters
  };
}

/**
 * Extrae el nombre del evento de un argumento
 *
 * @param {object} arg - Nodo AST del argumento
 * @returns {string|null} - Nombre del evento o null
 */
function extractEventName(arg) {
  if (!arg) return null;

  // String literal: .on('event-name', ...)
  if (arg.type === 'StringLiteral') {
    return arg.value;
  }

  // Identifier: .on(EVENT_NAME, ...) - no puedo estar seguro
  if (arg.type === 'Identifier') {
    return null; // No podemos extraer dinámicamente
  }

  // Template literal: .on(`event:${type}`, ...) - no puedo estar seguro
  if (arg.type === 'TemplateLiteral') {
    return null;
  }

  return null;
}

/**
 * Calcula confianza basada en tipo de argumento
 *
 * @param {object} arg - Nodo AST del argumento
 * @returns {number} - 0-1
 */
function getConfidence(arg) {
  if (arg?.type === 'StringLiteral') {
    return 1.0; // 100% seguro
  }

  if (arg?.type === 'Identifier') {
    return 0.5; // Variable - no seguro
  }

  if (arg?.type === 'TemplateLiteral') {
    return 0.6; // Template - parcialmente seguro
  }

  return 0.3; // Otro
}

/**
 * Genera conexiones semánticas de eventos
 *
 * @param {object} fileAnalysisMap - Mapa de filePath -> { eventListeners, eventEmitters }
 * @returns {array} - Array de conexiones semánticas
 */
export function generateEventConnections(fileAnalysisMap) {
  const connections = [];
  const eventIndex = new Map(); // Mapa de eventName -> { listeners: [], emitters: [] }

  // Indexar todos los eventos
  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    if (!analysis.eventListeners) analysis.eventListeners = [];
    if (!analysis.eventEmitters) analysis.eventEmitters = [];

    for (const listener of analysis.eventListeners) {
      if (!eventIndex.has(listener.eventName)) {
        eventIndex.set(listener.eventName, { listeners: [], emitters: [] });
      }
      eventIndex.get(listener.eventName).listeners.push({
        file: filePath,
        listener
      });
    }

    for (const emitter of analysis.eventEmitters) {
      if (!eventIndex.has(emitter.eventName)) {
        eventIndex.set(emitter.eventName, { listeners: [], emitters: [] });
      }
      eventIndex.get(emitter.eventName).emitters.push({
        file: filePath,
        emitter
      });
    }
  }

  // Generar conexiones: emitter -> listener
  for (const [eventName, { listeners, emitters }] of eventIndex.entries()) {
    for (const { file: emitterFile, emitter } of emitters) {
      for (const { file: listenerFile, listener } of listeners) {
        if (emitterFile !== listenerFile) {
          // Solo crear conexión si confidence es alta en ambos lados
          const minConfidence = Math.min(emitter.confidence, listener.confidence);

          if (minConfidence >= 0.7) {
            connections.push({
              id: `event_${eventName}_${emitterFile}_to_${listenerFile}`,
              type: 'event_listener',
              sourceFile: emitterFile,
              targetFile: listenerFile,
              eventName,
              reason: `${emitterFile} emits '${eventName}' and ${listenerFile} listens to it`,
              confidence: minConfidence,
              severity: calculateEventSeverity(eventName, listeners.length, emitters.length),
              evidence: {
                emitterCode: emitter,
                listenerCode: listener
              }
            });
          }
        }
      }
    }
  }

  return connections;
}

/**
 * Calcula severidad basada en patrón de eventos
 *
 * @param {string} eventName - Nombre del evento
 * @param {number} listenerCount - Cantidad de listeners
 * @param {number} emitterCount - Cantidad de emitters
 * @returns {string} - 'low' | 'medium' | 'high' | 'critical'
 */
function calculateEventSeverity(eventName, listenerCount, emitterCount) {
  // Si hay múltiples emitters y listeners -> CRITICAL
  if (emitterCount > 1 && listenerCount > 1) {
    return 'critical';
  }

  // Eventos críticos
  const criticalPatterns = ['auth', 'login', 'logout', 'error', 'crash', 'fatal'];
  if (criticalPatterns.some(pattern => eventName.toLowerCase().includes(pattern))) {
    return 'high';
  }

  // Múltiples listeners
  if (listenerCount > 3) {
    return 'high';
  }

  return 'medium';
}

export default {
  detectEventPatterns,
  generateEventConnections
};
