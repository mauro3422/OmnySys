/**
 * @fileoverview Event Handler Detector
 * 
 * Detecta handlers de eventos
 * 
 * @module module-system/detectors/event-detector
 * @phase 3
 */

import path from 'path';
import { findMolecule, getAllAtoms, camelToKebab } from '../utils.js';

/**
 * Busca handlers de eventos
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Event handlers encontrados
 */
export function findEventHandlers(modules) {
  const handlers = [];
  
  for (const module of modules) {
    for (const atom of getAllAtoms(module)) {
      // Buscar patrones de event handlers
      if (/^on[A-Z]|^handleEvent|^processEvent/i.test(atom.name)) {
        const eventName = inferEventName(atom.name);
        
        handlers.push({
          type: 'event',
          event: eventName,
          handler: {
            module: module.moduleName,
            file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
            function: atom.name
          }
        });
      }
    }
  }
  
  return handlers;
}

/**
 * Infiere nombre de evento desde función
 * @param {string} functionName - Nombre de función
 * @returns {string} - Nombre del evento
 */
function inferEventName(functionName) {
  if (/^on(.+)$/.test(functionName)) {
    return camelToKebab(functionName.match(/^on(.+)$/)[1]);
  }
  return 'unknown';
}


