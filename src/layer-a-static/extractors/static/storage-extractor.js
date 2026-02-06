/**
 * @fileoverview storage-extractor.js
 * 
 * Extrae uso de localStorage/sessionStorage del código
 * 
 * @module extractors/static/storage-extractor
 */

import { STORAGE_PATTERNS } from './constants.js';
import { getLineNumber } from './utils.js';

/**
 * Extrae todas las keys de localStorage/sessionStorage usadas en el código
 * @param {string} code - Código fuente
 * @returns {Object} - {reads: [], writes: [], all: []}
 */
export function extractLocalStorageKeys(code) {
  const reads = [];
  const writes = [];
  
  // Extraer writes
  for (const pattern of STORAGE_PATTERNS.writes) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      writes.push({
        key: match[1],
        line: getLineNumber(code, match.index),
        type: 'write'
      });
    }
  }
  
  // Extraer reads
  for (const pattern of STORAGE_PATTERNS.reads) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      reads.push({
        key: match[1],
        line: getLineNumber(code, match.index),
        type: 'read'
      });
    }
  }
  
  return {
    reads,
    writes,
    all: [...reads, ...writes]
  };
}

/**
 * Extrae solo las keys de escritura (para análisis de impacto)
 * @param {string} code - Código fuente
 * @returns {string[]} - Keys que se escriben
 */
export function extractStorageWrites(code) {
  const writes = new Set();
  
  for (const pattern of STORAGE_PATTERNS.writes) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      writes.add(match[1]);
    }
  }
  
  return Array.from(writes);
}

/**
 * Extrae solo las keys de lectura
 * @param {string} code - Código fuente
 * @returns {string[]} - Keys que se leen
 */
export function extractStorageReads(code) {
  const reads = new Set();
  
  for (const pattern of STORAGE_PATTERNS.reads) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      reads.add(match[1]);
    }
  }
  
  return Array.from(reads);
}
