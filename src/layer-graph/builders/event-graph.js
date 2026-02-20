/**
 * @fileoverview event-graph.js
 * 
 * Construye el grafo de eventos conectando emitters → events → handlers.
 * Usa los datos de temporal.patterns.events extraídos por Layer A.
 * 
 * @module layer-graph/builders/event-graph
 */

import { createEventNode } from '../core/types.js';

/**
 * Construye el grafo de eventos desde los átomos
 * @param {Map} atoms - Mapa de átomos con metadata
 * @returns {Object} - Grafo de eventos {nodes, edges}
 */
export function buildEventGraph(atoms) {
  const events = new Map(); // eventName -> {emitters, handlers}
  const nodes = [];
  const edges = [];
  
  for (const [atomId, atom] of atoms) {
    // Buscar eventos en temporal.patterns.events
    const eventPatterns = atom.temporal?.patterns?.events || [];
    
    for (const event of eventPatterns) {
      const eventName = event.name || event.type || 'unknown';
      const eventType = event.action || 'unknown'; // 'on', 'emit', 'addEventListener'
      
      // Inicializar evento si no existe
      if (!events.has(eventName)) {
        events.set(eventName, {
          name: eventName,
          emitters: [],
          handlers: []
        });
      }
      
      const eventData = events.get(eventName);
      
      if (eventType === 'emit' || eventType === 'dispatch') {
        // Este átomo emite el evento
        eventData.emitters.push({
          atomId,
          atomName: atom.name,
          file: atom.filePath,
          line: event.line || atom.line
        });
      } else if (eventType === 'on' || eventType === 'addEventListener' || eventType === 'subscribe') {
        // Este átomo maneja el evento
        eventData.handlers.push({
          atomId,
          atomName: atom.name,
          file: atom.filePath,
          line: event.line || atom.line
        });
      }
    }
  }
  
  // Crear nodos de eventos
  for (const [eventName, eventData] of events) {
    nodes.push(createEventNode(eventName, {
      emitters: eventData.emitters,
      handlers: eventData.handlers,
      file: eventData.emitters[0]?.file || eventData.handlers[0]?.file
    }));
    
    // Crear edges: emitters → event
    for (const emitter of eventData.emitters) {
      edges.push({
        from: emitter.atomId,
        to: `event:${eventName}`,
        type: 'emits',
        file: emitter.file,
        line: emitter.line
      });
    }
    
    // Crear edges: event → handlers
    for (const handler of eventData.handlers) {
      edges.push({
        from: `event:${eventName}`,
        to: handler.atomId,
        type: 'handles',
        file: handler.file,
        line: handler.line
      });
    }
  }
  
  return {
    nodes,
    edges,
    meta: {
      totalEvents: events.size,
      totalEmitters: [...events.values()].reduce((sum, e) => sum + e.emitters.length, 0),
      totalHandlers: [...events.values()].reduce((sum, e) => sum + e.handlers.length, 0)
    }
  };
}

/**
 * Encuentra cadenas de eventos (event chains)
 * @param {Object} eventGraph - Grafo de eventos
 * @param {Map} atoms - Mapa de átomos
 * @returns {Array} - Cadenas de eventos detectadas
 */
export function findEventChains(eventGraph, atoms) {
  const chains = [];
  
  // Buscar patrones: emitter → event → handler → emit → event → handler
  for (const node of eventGraph.nodes) {
    if (node.type !== 'event') continue;
    
    // Buscar handlers que también emiten eventos
    for (const handler of node.handlers) {
      const handlerAtom = atoms.get(handler.atomId);
      if (!handlerAtom) continue;
      
      const handlerEvents = handlerAtom.temporal?.patterns?.events || [];
      const emits = handlerEvents.filter(e => e.action === 'emit' || e.action === 'dispatch');
      
      for (const emit of emits) {
        chains.push({
          type: 'event-chain',
          events: [node.name, emit.name || emit.type],
          path: [
            `${handler.atomName} handles ${node.name}`,
            `${handler.atomName} emits ${emit.name || emit.type}`
          ],
          file: handler.file
        });
      }
    }
  }
  
  return chains;
}

/**
 * Obtiene estadísticas del grafo de eventos
 * @param {Object} eventGraph - Grafo de eventos
 * @returns {Object} - Estadísticas
 */
export function getEventGraphStats(eventGraph) {
  const eventTypes = {};
  
  for (const node of eventGraph.nodes) {
    const event = node.name;
    // Categorizar tipo de evento
    if (event.includes('click') || event.includes('submit') || event.includes('keydown')) {
      eventTypes['dom-event'] = (eventTypes['dom-event'] || 0) + 1;
    } else if (event.includes('data') || event.includes('message') || event.includes('response')) {
      eventTypes['data-event'] = (eventTypes['data-event'] || 0) + 1;
    } else if (event.includes('error') || event.includes('fail')) {
      eventTypes['error-event'] = (eventTypes['error-event'] || 0) + 1;
    } else {
      eventTypes['custom-event'] = (eventTypes['custom-event'] || 0) + 1;
    }
  }
  
  return {
    totalEvents: eventGraph.nodes.length,
    eventTypes,
    totalEmitters: eventGraph.meta?.totalEmitters || 0,
    totalHandlers: eventGraph.meta?.totalHandlers || 0
  };
}

export default { buildEventGraph, findEventChains, getEventGraphStats };
