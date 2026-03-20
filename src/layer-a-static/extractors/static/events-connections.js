/**
 * @fileoverview events-connections.js
 *
 * Detecta conexiones entre archivos basadas en eventos compartidos
 *
 * @module extractors/static/events-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

function toEventNameSet(items = []) {
  return new Set(
    items
      .map(item => item?.event || item)
      .filter(Boolean)
  );
}

function normalizeEventSummary(events = {}) {
  return {
    events: toEventNameSet(events.all || []),
    emitters: toEventNameSet(events.emitters || []),
    listeners: toEventNameSet(events.listeners || [])
  };
}

function buildEventIndex(fileResults = {}) {
  const index = new Map();

  for (const [filePath, results] of Object.entries(fileResults)) {
    const summary = normalizeEventSummary(results?.events || {});

    for (const eventName of summary.events) {
      if (!index.has(eventName)) {
        index.set(eventName, []);
      }

      index.get(eventName).push({ filePath, summary });
    }
  }

  return index;
}

/**
 * Detecta conexiones entre archivos basadas en eventos compartidos
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectEventConnections(fileResults) {
  const connections = [];
  const index = buildEventIndex(fileResults);

  for (const [eventName, entries] of index) {
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      const entryA = entries[i];

      for (let j = i + 1; j < entries.length; j++) {
        const entryB = entries[j];
        const emitsA = entryA.summary.emitters.has(eventName);
        const listensA = entryA.summary.listeners.has(eventName);
        const emitsB = entryB.summary.emitters.has(eventName);
        const listensB = entryB.summary.listeners.has(eventName);

        let source = entryA.filePath;
        let target = entryB.filePath;

        if (emitsB && listensA) {
          source = entryB.filePath;
          target = entryA.filePath;
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

  return connections;
}

/**
 * Verifica si dos archivos comparten eventos
 * @param {Object} eventsA - Resultados de eventos del archivo A
 * @param {Object} eventsB - Resultados de eventos del archivo B
 * @returns {boolean}
 */
export function sharesEvents(eventsA, eventsB) {
  const setA = normalizeEventSummary(eventsA || {}).events;
  const setB = normalizeEventSummary(eventsB || {}).events;

  if (!setA.size || !setB.size) return false;

  for (const eventName of setB) {
    if (setA.has(eventName)) return true;
  }

  return false;
}

/**
 * Encuentra la dirección del flujo de eventos entre dos archivos
 * @param {Object} eventsA - Resultados de eventos del archivo A
 * @param {Object} eventsB - Resultados de eventos del archivo B
 * @param {string} eventName - Nombre del evento
 * @returns {Object} - { source: string, target: string, flow: string }
 */
export function getEventFlow(eventsA, eventsB, eventName) {
  const summaryA = normalizeEventSummary(eventsA || {});
  const summaryB = normalizeEventSummary(eventsB || {});
  const emitsA = summaryA.emitters.has(eventName);
  const listensA = summaryA.listeners.has(eventName);
  const emitsB = summaryB.emitters.has(eventName);
  const listensB = summaryB.listeners.has(eventName);

  if (emitsA && listensB) {
    return { source: 'A', target: 'B', flow: 'A → B' };
  } else if (emitsB && listensA) {
    return { source: 'B', target: 'A', flow: 'B → A' };
  }

  return { source: null, target: null, flow: 'bidirectional' };
}
