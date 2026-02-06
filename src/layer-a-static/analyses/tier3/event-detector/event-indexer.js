/**
 * @fileoverview event-indexer.js
 * 
 * Indexación de eventos y bus objects
 * 
 * @module analyses/tier3/event-detector/event-indexer
 */

/**
 * Indexa eventos por nombre
 * @param {Object} fileAnalysisMap - Mapa de filePath -> analysis
 * @returns {Map} - eventName -> { listeners: [], emitters: [] }
 */
export function indexEventsByName(fileAnalysisMap) {
  const eventIndex = new Map();

  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    const listeners = analysis.eventListeners || [];
    const emitters = analysis.eventEmitters || [];

    // Indexar listeners
    for (const listener of listeners) {
      if (!eventIndex.has(listener.eventName)) {
        eventIndex.set(listener.eventName, { listeners: [], emitters: [] });
      }
      eventIndex.get(listener.eventName).listeners.push({
        file: filePath,
        listener
      });
    }

    // Indexar emitters
    for (const emitter of emitters) {
      if (!eventIndex.has(emitter.eventName)) {
        eventIndex.set(emitter.eventName, { listeners: [], emitters: [] });
      }
      eventIndex.get(emitter.eventName).emitters.push({
        file: filePath,
        emitter
      });
    }
  }

  return eventIndex;
}

/**
 * Indexa bus objects (ej: window.eventBus)
 * @param {Object} fileAnalysisMap - Mapa de filePath -> analysis
 * @returns {Map} - busKey -> { listeners: [], emitters: [], ownerFile: null }
 */
export function indexBusObjects(fileAnalysisMap) {
  const busObjectIndex = new Map();

  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    const listeners = analysis.eventListeners || [];
    const emitters = analysis.eventEmitters || [];

    // Indexar listeners por bus
    for (const listener of listeners) {
      const busKey = listener.objectName || 'window';
      if (!busObjectIndex.has(busKey)) {
        busObjectIndex.set(busKey, { listeners: [], emitters: [], ownerFile: null });
      }
      busObjectIndex.get(busKey).listeners.push(filePath);
    }

    // Indexar emitters por bus
    for (const emitter of emitters) {
      const busKey = emitter.objectName || 'window';
      if (!busObjectIndex.has(busKey)) {
        busObjectIndex.set(busKey, { listeners: [], emitters: [], ownerFile: null });
      }
      busObjectIndex.get(busKey).emitters.push(filePath);
    }
  }

  return busObjectIndex;
}

/**
 * Obtiene archivos únicos que acceden a un bus
 * @param {Object} busData - Datos del bus { listeners: [], emitters: [] }
 * @returns {string[]} - Archivos únicos
 */
export function getBusAccessors(busData) {
  return [...new Set([...busData.listeners, ...busData.emitters])];
}

/**
 * Obtiene estadísticas de eventos
 * @param {Map} eventIndex - Index de eventos
 * @returns {Object} - Estadísticas
 */
export function getEventStats(eventIndex) {
  let totalListeners = 0;
  let totalEmitters = 0;
  
  for (const { listeners, emitters } of eventIndex.values()) {
    totalListeners += listeners.length;
    totalEmitters += emitters.length;
  }
  
  return {
    totalEvents: eventIndex.size,
    totalListeners,
    totalEmitters
  };
}
