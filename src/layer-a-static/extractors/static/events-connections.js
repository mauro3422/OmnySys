/**
 * @fileoverview events-connections.js
 * 
 * Detecta conexiones entre archivos basadas en eventos compartidos
 * 
 * @module extractors/static/events-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

/**
 * Detecta conexiones entre archivos basadas en eventos compartidos
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectEventConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const eventsA = resultsA.events || { all: [] };
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const eventsB = resultsB.events || { all: [] };
      
      // Buscar eventos comunes
      const eventsA_set = new Set(eventsA.all.map(e => e.event));
      const eventsB_list = eventsB.all.map(e => e.event);
      const commonEvents = eventsB_list.filter(e => eventsA_set.has(e));
      
      if (commonEvents.length > 0) {
        for (const eventName of commonEvents) {
          const emitsA = eventsA.emitters.some(e => e.event === eventName);
          const listensA = eventsA.listeners.some(e => e.event === eventName);
          const emitsB = eventsB.emitters.some(e => e.event === eventName);
          const listensB = eventsB.listeners.some(e => e.event === eventName);
          
          // Determinar dirección: emisor -> listener
          let source = fileA;
          let target = fileB;
          
          if (emitsA && listensB) {
            source = fileA;
            target = fileB;
          } else if (emitsB && listensA) {
            source = fileB;
            target = fileA;
          }
          
          connections.push({
            id: `event_${eventName}_${source}_to_${target}`,
            sourceFile: source,
            targetFile: target,
            type: ConnectionType.EVENT_LISTENER,
            via: 'event',
            event: eventName,
            direction: `${emitsA ? 'emits' : 'listens'} → ${emitsB ? 'emits' : 'listens'}`,
            confidence: DEFAULT_CONFIDENCE,
            detectedBy: 'static-extractor',
            reason: `Both files use event '${eventName}'`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Verifica si dos archivos comparten eventos
 * @param {Object} eventsA - Resultados de eventos del archivo A
 * @param {Object} eventsB - Resultados de eventos del archivo B
 * @returns {boolean}
 */
export function sharesEvents(eventsA, eventsB) {
  if (!eventsA?.all?.length || !eventsB?.all?.length) return false;
  
  const setA = new Set(eventsA.all.map(e => e.event));
  const listB = eventsB.all.map(e => e.event);
  
  return listB.some(e => setA.has(e));
}

/**
 * Encuentra la dirección del flujo de eventos entre dos archivos
 * @param {Object} eventsA - Resultados de eventos del archivo A
 * @param {Object} eventsB - Resultados de eventos del archivo B
 * @param {string} eventName - Nombre del evento
 * @returns {Object} - { source: string, target: string, flow: string }
 */
export function getEventFlow(eventsA, eventsB, eventName) {
  const emitsA = eventsA?.emitters?.some(e => e.event === eventName) ?? false;
  const listensA = eventsA?.listeners?.some(e => e.event === eventName) ?? false;
  const emitsB = eventsB?.emitters?.some(e => e.event === eventName) ?? false;
  const listensB = eventsB?.listeners?.some(e => e.event === eventName) ?? false;
  
  if (emitsA && listensB) {
    return { source: 'A', target: 'B', flow: 'A → B' };
  } else if (emitsB && listensA) {
    return { source: 'B', target: 'A', flow: 'B → A' };
  }
  
  return { source: null, target: null, flow: 'bidirectional' };
}
