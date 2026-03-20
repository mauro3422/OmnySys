/**
 * @fileoverview globals-connections.js
 * 
 * Detecta conexiones entre archivos basadas en variables globales compartidas
 * 
 * @module extractors/static/globals-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

function toGlobalPropertySet(items = []) {
  return new Set(
    items
      .map(item => item?.property || item)
      .filter(Boolean)
  );
}

function normalizeGlobalSummary(globals = {}) {
  return {
    properties: toGlobalPropertySet(globals.all || []),
    writes: toGlobalPropertySet(globals.writes || []),
    reads: toGlobalPropertySet(globals.reads || [])
  };
}

function buildGlobalIndex(fileResults = {}) {
  const index = new Map();

  for (const [filePath, results] of Object.entries(fileResults)) {
    const summary = normalizeGlobalSummary(results?.globals || {});

    for (const property of summary.properties) {
      if (!index.has(property)) {
        index.set(property, []);
      }

      index.get(property).push({ filePath, summary });
    }
  }

  return index;
}

/**
 * Detecta conexiones entre archivos basadas en variables globales compartidas
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectGlobalConnections(fileResults) {
  const connections = [];
  const index = buildGlobalIndex(fileResults);

  for (const [property, entries] of index) {
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      const entryA = entries[i];

      for (let j = i + 1; j < entries.length; j++) {
        const entryB = entries[j];
        const direction = [];

        if (entryA.summary.writes.has(property)) direction.push(`${entryA.filePath} → writes`);
        if (entryA.summary.reads.has(property)) direction.push(`${entryA.filePath} → reads`);
        if (entryB.summary.writes.has(property)) direction.push(`${entryB.filePath} → writes`);
        if (entryB.summary.reads.has(property)) direction.push(`${entryB.filePath} → reads`);

        connections.push({
          id: `global_${property}_${entryA.filePath}_to_${entryB.filePath}`,
          sourceFile: entryA.filePath,
          targetFile: entryB.filePath,
          type: ConnectionType.GLOBAL_VARIABLE,
          via: 'global',
          property,
          direction: direction.join(', '),
          confidence: DEFAULT_CONFIDENCE,
          detectedBy: 'static-extractor',
          reason: `Both files use global variable '${property}'`
        });
      }
    }
  }

  return connections;
}

/**
 * Verifica si dos archivos comparten variables globales
 * @param {Object} globalsA - Resultados de globales del archivo A
 * @param {Object} globalsB - Resultados de globales del archivo B
 * @returns {boolean}
 */
export function sharesGlobalVariables(globalsA, globalsB) {
  const propsA = normalizeGlobalSummary(globalsA || {}).properties;
  const propsB = normalizeGlobalSummary(globalsB || {}).properties;

  if (!propsA.size || !propsB.size) return false;

  for (const property of propsB) {
    if (propsA.has(property)) return true;
  }

  return false;
}

/**
 * Obtiene las propiedades globales compartidas entre dos archivos
 * @param {Object} globalsA - Resultados de globales del archivo A
 * @param {Object} globalsB - Resultados de globales del archivo B
 * @returns {string[]} - Propiedades comunes
 */
export function getSharedGlobalVariables(globalsA, globalsB) {
  const propsA = normalizeGlobalSummary(globalsA || {}).properties;
  const propsB = normalizeGlobalSummary(globalsB || {}).properties;

  if (!propsA.size || !propsB.size) return [];

  const shared = [];
  for (const property of propsB) {
    if (propsA.has(property)) {
      shared.push(property);
    }
  }

  return shared;
}

