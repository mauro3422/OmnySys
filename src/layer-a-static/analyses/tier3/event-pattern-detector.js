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
  const busObjectIndex = new Map(); // Mapa de busObject (ej: 'window.eventBus') -> files que lo usan

  // Indexar todos los eventos y buses
  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    if (!analysis.eventListeners) analysis.eventListeners = [];
    if (!analysis.eventEmitters) analysis.eventEmitters = [];

    // Indexar listeners
    for (const listener of analysis.eventListeners) {
      if (!eventIndex.has(listener.eventName)) {
        eventIndex.set(listener.eventName, { listeners: [], emitters: [] });
      }
      eventIndex.get(listener.eventName).listeners.push({
        file: filePath,
        listener
      });

      // Registrar qué file accede a qué bus object
      const busKey = listener.objectName || 'window';
      if (!busObjectIndex.has(busKey)) {
        busObjectIndex.set(busKey, { listeners: [], emitters: [], ownerFile: null });
      }
      busObjectIndex.get(busKey).listeners.push(filePath);
    }

    // Indexar emitters
    for (const emitter of analysis.eventEmitters) {
      if (!eventIndex.has(emitter.eventName)) {
        eventIndex.set(emitter.eventName, { listeners: [], emitters: [] });
      }
      eventIndex.get(emitter.eventName).emitters.push({
        file: filePath,
        emitter
      });

      // Registrar qué file accede a qué bus object
      const busKey = emitter.objectName || 'window';
      if (!busObjectIndex.has(busKey)) {
        busObjectIndex.set(busKey, { listeners: [], emitters: [], ownerFile: null });
      }
      busObjectIndex.get(busKey).emitters.push(filePath);
    }
  }

  // Identificar archivos propietarios del bus (heurística: nombre contiene EventBus, events, etc.)
  const busOwners = new Map(); // busKey -> ownerFile
  for (const [busKey, busData] of busObjectIndex.entries()) {
    const allAccessors = [...new Set([...busData.listeners, ...busData.emitters])];

    // Heurística: el propietario es el archivo que:
    // 1. Tiene 'EventBus' o 'events' en el nombre (buscar entre TODOS los archivos)
    // 2. Si no se encuentra, usar el primer accessor

    // Primero buscar entre todos los archivos del mapa (fileAnalysisMap tiene todos los archivos)
    const allFiles = Object.keys(fileAnalysisMap);
    const possibleOwners = allFiles.filter(f => {
      const fileName = f.toLowerCase();
      return fileName.includes('eventbus') || fileName.includes('event-bus') || fileName.includes('/events.js');
    });

    if (possibleOwners.length > 0) {
      busOwners.set(busKey, possibleOwners[0]);
    } else if (allAccessors.length > 0) {
      // Fallback: usar el primer accessor como dueño
      busOwners.set(busKey, allAccessors[0]);
    }
  }

  // Consolidar conexiones por (sourceFile, targetFile) pair
  const consolidatedMap = new Map(); // Key: `${sourceFile}→${targetFile}`, Value: connection data

  // Patrón 1: Generar conexiones: emitter -> listener
  for (const [eventName, { listeners, emitters }] of eventIndex.entries()) {
    for (const { file: emitterFile, emitter } of emitters) {
      for (const { file: listenerFile, listener } of listeners) {
        if (emitterFile !== listenerFile) {
          // Solo crear conexión si confidence es alta en ambos lados
          const minConfidence = Math.min(emitter.confidence, listener.confidence);

          if (minConfidence >= 0.7) {
            const key = `${emitterFile}→${listenerFile}`;

            if (!consolidatedMap.has(key)) {
              consolidatedMap.set(key, {
                sourceFile: emitterFile,
                targetFile: listenerFile,
                eventNames: [],
                avgConfidence: 0,
                evidences: []
              });
            }

            const data = consolidatedMap.get(key);
            data.eventNames.push(eventName);
            data.evidences.push({ eventName, emitter, listener });
            data.avgConfidence = (data.avgConfidence + minConfidence) / 2;
          }
        }
      }
    }
  }

  // Patrón 2: Crear conexiones listeners → event bus owner
  for (const [busKey, busData] of busObjectIndex.entries()) {
    const ownerFile = busOwners.get(busKey);
    if (!ownerFile) continue;

    for (const listenerFile of busData.listeners) {
      if (listenerFile !== ownerFile) {
        const key = `${listenerFile}→${ownerFile}`;
        if (!consolidatedMap.has(key)) {
          consolidatedMap.set(key, {
            sourceFile: listenerFile,
            targetFile: ownerFile,
            eventNames: [],
            avgConfidence: 0.95,
            evidences: [],
            isBusConnection: true
          });
        }
      }
    }
  }

  // Patrón 3: Crear conexiones emitters → event bus owner
  for (const [busKey, busData] of busObjectIndex.entries()) {
    const ownerFile = busOwners.get(busKey);
    if (!ownerFile) continue;

    for (const emitterFile of busData.emitters) {
      if (emitterFile !== ownerFile) {
        const key = `${emitterFile}→${ownerFile}`;
        if (!consolidatedMap.has(key)) {
          consolidatedMap.set(key, {
            sourceFile: emitterFile,
            targetFile: ownerFile,
            eventNames: [],
            avgConfidence: 0.95,
            evidences: [],
            isBusConnection: true
          });
        }
      }
    }
  }

  // Crear conexiones consolidadas
  for (const [_, data] of consolidatedMap.entries()) {
    if (data.isBusConnection) {
      connections.push({
        id: `event_${data.sourceFile}_to_${data.targetFile}`,
        type: 'event_listener',
        sourceFile: data.sourceFile,
        targetFile: data.targetFile,
        eventNames: data.eventNames || [],
        eventCount: data.eventNames?.length || 0,
        reason: `${data.sourceFile} uses event bus created by ${data.targetFile}.`,
        confidence: data.avgConfidence,
        severity: 'high',
        evidence: data.evidences
      });
    } else {
      connections.push({
        id: `event_${data.sourceFile}_to_${data.targetFile}`,
        type: 'event_listener',
        sourceFile: data.sourceFile,
        targetFile: data.targetFile,
        eventNames: data.eventNames,
        eventCount: data.eventNames.length,
        reason: `${data.sourceFile} emits events that ${data.targetFile} listens to`,
        confidence: data.avgConfidence,
        severity: calculateEventSeverity('', data.eventNames.length, 1),
        evidence: data.evidences
      });
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
