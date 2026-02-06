/**
 * @fileoverview bus-owner-detector.js
 * 
 * Detección de propietarios de event bus
 * 
 * @module analyses/tier3/event-detector/bus-owner-detector
 */

import { BUS_OWNER_PATTERNS } from './constants.js';
import { getBusAccessors } from './event-indexer.js';

/**
 * Detecta propietarios de buses de eventos
 * @param {Map} busObjectIndex - Index de bus objects
 * @param {Object} fileAnalysisMap - Mapa de filePath -> analysis
 * @returns {Map} - busKey -> ownerFile
 */
export function detectBusOwners(busObjectIndex, fileAnalysisMap) {
  const busOwners = new Map();
  
  const allFiles = Object.keys(fileAnalysisMap);

  for (const [busKey, busData] of busObjectIndex.entries()) {
    const allAccessors = getBusAccessors(busData);

    // Heurística: buscar archivos con nombres que indiquen propietario
    const possibleOwners = allFiles.filter(f => isPossibleBusOwner(f));

    if (possibleOwners.length > 0) {
      busOwners.set(busKey, possibleOwners[0]);
    } else if (allAccessors.length > 0) {
      // Fallback: usar el primer accessor como dueño
      busOwners.set(busKey, allAccessors[0]);
    }
  }

  return busOwners;
}

/**
 * Verifica si un archivo es posible propietario de bus
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean}
 */
export function isPossibleBusOwner(filePath) {
  const fileName = filePath.toLowerCase();
  return BUS_OWNER_PATTERNS.some(pattern => fileName.includes(pattern));
}

/**
 * Obtiene el propietario de un bus específico
 * @param {string} busKey - Clave del bus
 * @param {Map} busOwners - Mapa de propietarios
 * @returns {string|null}
 */
export function getBusOwner(busKey, busOwners) {
  return busOwners.get(busKey) || null;
}

/**
 * Lista todos los buses sin propietario identificado
 * @param {Map} busObjectIndex - Index de buses
 * @param {Map} busOwners - Mapa de propietarios
 * @returns {string[]} - Claves de buses sin dueño
 */
export function getOrphanBuses(busObjectIndex, busOwners) {
  const orphans = [];
  
  for (const busKey of busObjectIndex.keys()) {
    if (!busOwners.has(busKey)) {
      orphans.push(busKey);
    }
  }
  
  return orphans;
}
