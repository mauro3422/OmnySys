/**
 * @fileoverview event-pattern-detector.js
 *
 * Detecta patrones de eventos (listeners, emitters) en código fuente.
 * Stub funcional - implementación completa pendiente.
 *
 * @module layer-a-static/analyses/tier3/event-pattern-detector
 * @phase Layer A (Static Extraction)
 * @status STUB - returns safe empty defaults
 */

/**
 * Detecta patrones de eventos en código fuente.
 * @param {string} code - Código fuente a analizar
 * @param {string} filePath - Path del archivo (para contexto)
 * @returns {{ eventListeners: Array, eventEmitters: Array }}
 */
export function detectEventPatterns(code, filePath) {
  if (!code || typeof code !== 'string') {
    return { eventListeners: [], eventEmitters: [] };
  }

  const eventListeners = [];
  const eventEmitters = [];

  // addEventListener / on() patterns
  const listenerPatterns = [
    /\.addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\.on\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /EventEmitter.*?\.on\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];

  for (const pattern of listenerPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      eventListeners.push({
        event: match[1],
        line: code.slice(0, match.index).split('\n').length,
        file: filePath,
        raw: match[0]
      });
    }
  }

  // emit() / dispatchEvent() patterns
  const emitterPatterns = [
    /\.emit\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\.dispatchEvent\s*\(\s*new\s+\w+\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\.trigger\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];

  for (const pattern of emitterPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      eventEmitters.push({
        event: match[1],
        line: code.slice(0, match.index).split('\n').length,
        file: filePath,
        raw: match[0]
      });
    }
  }

  return { eventListeners, eventEmitters };
}

/**
 * Genera conexiones de eventos entre archivos del proyecto.
 * @param {Object} fileEventDataMap - Mapa { filePath: { eventListeners, eventEmitters } }
 * @returns {Array<{ from: string, to: string, event: string, type: string }>}
 */
export function generateEventConnections(fileEventDataMap) {
  if (!fileEventDataMap || typeof fileEventDataMap !== 'object') {
    return [];
  }

  const connections = [];

  // Construir índice: event → emitters
  const emitterIndex = {};
  for (const [filePath, data] of Object.entries(fileEventDataMap)) {
    for (const emitter of (data.eventEmitters || [])) {
      if (!emitterIndex[emitter.event]) {
        emitterIndex[emitter.event] = [];
      }
      emitterIndex[emitter.event].push(filePath);
    }
  }

  // Conectar listeners con emitters del mismo evento
  for (const [filePath, data] of Object.entries(fileEventDataMap)) {
    for (const listener of (data.eventListeners || [])) {
      const emitters = emitterIndex[listener.event] || [];
      for (const emitterFile of emitters) {
        if (emitterFile !== filePath) {
          connections.push({
            from: emitterFile,
            to: filePath,
            event: listener.event,
            type: 'event-connection'
          });
        }
      }
    }
  }

  return connections;
}
