/**
 * @fileoverview connection-generator.js
 * 
 * Generador de conexiones semánticas de eventos
 * 
 * @module analyses/tier3/event-detector/connection-generator
 */

import { ConnectionType, MIN_CONFIDENCE_THRESHOLD } from './constants.js';
import { indexEventsByName, indexBusObjects } from './event-indexer.js';
import { detectBusOwners } from './bus-owner-detector.js';
import { determineConnectionSeverity } from './severity-calculator.js';

/**
 * Genera conexiones semánticas de eventos
 * @param {Object} fileAnalysisMap - Mapa de filePath -> analysis
 * @returns {Array} - Array de conexiones
 */
export function generateEventConnections(fileAnalysisMap) {
  const connections = [];
  
  // Indexar eventos y buses
  const eventIndex = indexEventsByName(fileAnalysisMap);
  const busObjectIndex = indexBusObjects(fileAnalysisMap);
  const busOwners = detectBusOwners(busObjectIndex, fileAnalysisMap);
  
  // Mapa de conexiones consolidadas
  const consolidatedMap = new Map();
  
  // Patrón 1: emitter -> listener
  generateEmitterListenerConnections(eventIndex, consolidatedMap);
  
  // Patrón 2 & 3: listeners/emitters -> bus owner
  generateBusConnections(busObjectIndex, busOwners, consolidatedMap);
  
  // Crear conexiones finales
  for (const data of consolidatedMap.values()) {
    connections.push(createConnection(data));
  }

  return connections;
}

/**
 * Genera conexiones emitter -> listener
 * @param {Map} eventIndex - Index de eventos
 * @param {Map} consolidatedMap - Mapa de conexiones consolidadas
 */
function generateEmitterListenerConnections(eventIndex, consolidatedMap) {
  for (const [eventName, { listeners, emitters }] of eventIndex.entries()) {
    for (const { file: emitterFile, emitter } of emitters) {
      for (const { file: listenerFile, listener } of listeners) {
        if (emitterFile === listenerFile) continue;
        
        const minConfidence = Math.min(emitter.confidence, listener.confidence);
        
        if (minConfidence < MIN_CONFIDENCE_THRESHOLD) continue;
        
        const key = `${emitterFile}→${listenerFile}`;
        
        if (!consolidatedMap.has(key)) {
          consolidatedMap.set(key, {
            sourceFile: emitterFile,
            targetFile: listenerFile,
            eventNames: [],
            avgConfidence: 0,
            evidences: [],
            isBusConnection: false
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

/**
 * Genera conexiones a propietarios de bus
 * @param {Map} busObjectIndex - Index de buses
 * @param {Map} busOwners - Mapa de propietarios
 * @param {Map} consolidatedMap - Mapa de conexiones consolidadas
 */
function generateBusConnections(busObjectIndex, busOwners, consolidatedMap) {
  for (const [busKey, busData] of busObjectIndex.entries()) {
    const ownerFile = busOwners.get(busKey);
    if (!ownerFile) continue;
    
    // Listeners -> owner
    for (const listenerFile of busData.listeners) {
      if (listenerFile === ownerFile) continue;
      
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
    
    // Emitters -> owner
    for (const emitterFile of busData.emitters) {
      if (emitterFile === ownerFile) continue;
      
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

/**
 * Crea objeto de conexión
 * @param {Object} data - Datos de la conexión
 * @returns {Object}
 */
function createConnection(data) {
  const base = {
    id: `event_${data.sourceFile}_to_${data.targetFile}`,
    type: ConnectionType.EVENT_LISTENER,
    sourceFile: data.sourceFile,
    targetFile: data.targetFile,
    eventNames: data.eventNames || [],
    eventCount: data.eventNames?.length || 0,
    confidence: data.avgConfidence,
    evidence: data.evidences
  };
  
  if (data.isBusConnection) {
    return {
      ...base,
      reason: `${data.sourceFile} uses event bus created by ${data.targetFile}.`,
      severity: 'high'
    };
  }
  
  return {
    ...base,
    reason: `${data.sourceFile} emits events that ${data.targetFile} listens to`,
    severity: determineConnectionSeverity(data.eventNames, data.eventNames.length)
  };
}
