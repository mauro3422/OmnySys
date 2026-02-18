/**
 * @fileoverview Path Utilities for Consistency Validator
 * 
 * Helpers para manejo de paths y detección de formatos.
 * 
 * @module consistency/utils/path-utils
 * @version 1.0.0
 */

import { normalizePath } from '../../../utils/path-utils.js';

/**
 * Detecta el formato de un path
 * @param {string} filePath - Path a analizar
 * @returns {string} - Formato detectado
 */
export function detectPathFormat(filePath) {
  if (!filePath || typeof filePath !== 'string') return 'unknown';
  if (filePath.includes(':\\')) return 'windows-absolute';
  if (filePath.includes('C:')) return 'windows-absolute';
  if (filePath.startsWith('/')) return 'unix-absolute';
  if (filePath.includes('\\')) return 'windows-relative';
  if (filePath.includes('/') && !filePath.includes('\\')) return 'unix-relative';
  return 'unknown';
}

/**
 * Detecta si un archivo es de test o histórico (evidencia, no error)
 * @param {string} filePath - Path del archivo
 * @returns {boolean} - True si es test/histórico
 */
export function isHistoricalOrTestFile(filePath) {
  const testPatterns = [
    /\btest\b/i,
    /\btests\b/i,
    /\btest-cases\b/i,
    /\.test\./i,
    /\.spec\./i,
    /\bscenario-\w+\b/i,
    /\bsmoke-test\b/i,
    /\b__tests__\b/i
  ];
  
  return testPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Busca un archivo por path (intentando varios formatos)
 * @param {string} filePath - Path a buscar
 * @param {Map} filesCache - Cache de archivos
 * @returns {Object|null} - Datos del archivo o null
 */
export function findFileByPath(filePath, filesCache) {
  // Intentar match exacto
  if (filesCache.has(filePath)) {
    return filesCache.get(filePath);
  }
  
  // Intentar con normalización
  const normalized = normalizePath(filePath);
  if (filesCache.has(normalized)) {
    return filesCache.get(normalized);
  }
  
  // Buscar por comparación
  for (const [key, value] of filesCache) {
    if (normalizePath(key) === normalized) {
      return value;
    }
  }
  
  return null;
}

/**
 * Verifica consistencia de formatos de path
 * @param {Map} atoms - Cache de átomos
 * @param {Map} files - Cache de archivos
 * @returns {Object|null} - Issue de inconsistencia o null
 */
export function checkPathFormatConsistency(atoms, files) {
  const pathFormats = new Map();
  
  // Recopilar formatos de path
  for (const atom of atoms.values()) {
    const format = detectPathFormat(atom.filePath);
    pathFormats.set(atom.id, { type: 'atom', format, path: atom.filePath });
  }
  
  for (const [filePath, fileData] of files) {
    const path = fileData.path || filePath;
    const format = detectPathFormat(path);
    pathFormats.set(filePath, { type: 'file', format, path });
  }
  
  // Verificar que todos usen el mismo formato
  const formats = new Set(Array.from(pathFormats.values()).map(p => p.format));
  if (formats.size > 1) {
    return {
      formats: Array.from(formats),
      details: Array.from(pathFormats.entries())
    };
  }
  
  return null;
}
