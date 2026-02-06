/**
 * @fileoverview globals-extractor.js
 * 
 * Extrae accesos a propiedades globales (window, global, globalThis)
 * 
 * @module extractors/static/globals-extractor
 */

import { GLOBAL_PATTERNS } from './constants.js';
import { getLineNumber, isNativeWindowProp } from './utils.js';

/**
 * Extrae accesos a propiedades globales (window, global, globalThis)
 * @param {string} code - Código fuente
 * @returns {Object} - {reads: [], writes: [], all: []}
 */
export function extractGlobalAccess(code) {
  const reads = [];
  const writes = [];
  
  for (const pattern of GLOBAL_PATTERNS.reads) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[1];
      // Ignorar propiedades nativas del browser
      if (!isNativeWindowProp(prop)) {
        reads.push({
          property: prop,
          line: getLineNumber(code, match.index),
          type: 'read'
        });
      }
    }
  }
  
  for (const pattern of GLOBAL_PATTERNS.writes) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[1];
      if (!isNativeWindowProp(prop)) {
        writes.push({
          property: prop,
          line: getLineNumber(code, match.index),
          type: 'write'
        });
      }
    }
  }
  
  return { reads, writes, all: [...reads, ...writes] };
}

/**
 * Extrae solo propiedades globales que se leen
 * @param {string} code - Código fuente
 * @returns {string[]} - Propiedades únicas
 */
export function extractGlobalReads(code) {
  const props = new Set();
  
  for (const pattern of GLOBAL_PATTERNS.reads) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[1];
      if (!isNativeWindowProp(prop)) {
        props.add(prop);
      }
    }
  }
  
  return Array.from(props);
}

/**
 * Extrae solo propiedades globales que se escriben
 * @param {string} code - Código fuente
 * @returns {string[]} - Propiedades únicas
 */
export function extractGlobalWrites(code) {
  const props = new Set();
  
  for (const pattern of GLOBAL_PATTERNS.writes) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[1];
      if (!isNativeWindowProp(prop)) {
        props.add(prop);
      }
    }
  }
  
  return Array.from(props);
}
