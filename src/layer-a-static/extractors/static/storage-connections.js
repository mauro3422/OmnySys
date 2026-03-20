/**
 * @fileoverview storage-connections.js
 * 
 * Detecta conexiones entre archivos basadas en localStorage compartido
 * 
 * @module extractors/static/storage-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

function toKeySet(items = []) {
  return new Set(
    items
      .map(item => item?.key)
      .filter(Boolean)
  );
}

function normalizeStorageSummary(storage = {}) {
  const allKeys = toKeySet(storage.all || []);
  const writes = toKeySet(storage.writes || []);
  const reads = toKeySet(storage.reads || []);

  return { allKeys, writes, reads };
}

function buildLocalStorageIndex(fileResults = {}) {
  const index = new Map();

  for (const [filePath, results] of Object.entries(fileResults)) {
    const summary = normalizeStorageSummary(results?.localStorage || {});

    for (const key of summary.allKeys) {
      if (!index.has(key)) {
        index.set(key, []);
      }

      index.get(key).push({
        filePath,
        summary
      });
    }
  }

  return index;
}

function buildDirectionForKey(entry, key, filePath) {
  const direction = [];
  if (entry.summary.writes.has(key)) direction.push(`${filePath} → writes`);
  if (entry.summary.reads.has(key)) direction.push(`${filePath} → reads`);
  return direction;
}

/**
 * Detecta conexiones entre archivos basadas en localStorage/sessionStorage compartido
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectLocalStorageConnections(fileResults) {
  const connections = [];
  const index = buildLocalStorageIndex(fileResults);

  for (const [key, entries] of index) {
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      const entryA = entries[i];

      for (let j = i + 1; j < entries.length; j++) {
        const entryB = entries[j];
        const direction = [
          ...buildDirectionForKey(entryA, key, entryA.filePath),
          ...buildDirectionForKey(entryB, key, entryB.filePath)
        ];

        connections.push({
          id: `localStorage_${key}_${entryA.filePath}_to_${entryB.filePath}`,
          sourceFile: entryA.filePath,
          targetFile: entryB.filePath,
          type: ConnectionType.LOCAL_STORAGE,
          via: 'localStorage',
          key,
          direction: direction.join(', '),
          confidence: DEFAULT_CONFIDENCE,
          detectedBy: 'static-extractor',
          reason: `Both files use localStorage key '${key}'`
        });
      }
    }
  }

  return connections;
}

/**
 * Verifica si dos archivos comparten keys de localStorage
 * @param {Object} storageA - Resultados de localStorage del archivo A
 * @param {Object} storageB - Resultados de localStorage del archivo B
 * @returns {boolean}
 */
export function sharesStorageKeys(storageA, storageB) {
  const keysA = normalizeStorageSummary(storageA).allKeys;
  const keysB = normalizeStorageSummary(storageB).allKeys;

  if (!keysA.size || !keysB.size) return false;

  for (const key of keysB) {
    if (keysA.has(key)) return true;
  }

  return false;
}

/**
 * Obtiene las keys compartidas entre dos archivos
 * @param {Object} storageA - Resultados de localStorage del archivo A
 * @param {Object} storageB - Resultados de localStorage del archivo B
 * @returns {string[]} - Keys comunes
 */
export function getSharedStorageKeys(storageA, storageB) {
  const keysA = normalizeStorageSummary(storageA).allKeys;
  const keysB = normalizeStorageSummary(storageB).allKeys;

  if (!keysA.size || !keysB.size) return [];

  const shared = [];
  for (const key of keysB) {
    if (keysA.has(key)) {
      shared.push(key);
    }
  }

  return shared;
}

