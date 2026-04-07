/**
 * @fileoverview Policy Drift Scanner
 *
 * Handles file system traversal and drift detection using the canonical compiler logic.
 *
 * @module shared/compiler/policy-drift-scanner
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { detectCompilerPolicyDriftFromSource } from './detection.js';

/**
 * Escanea un archivo y detecta policy drifts
 * @param {string} filePath - Ruta absoluta del archivo
 * @returns {Array} Lista de findings
 */
export function detectPolicyDrifts(filePath) {
  try {
    const source = readFileSync(filePath, 'utf-8');
    // Usar la misma función que el sistema real usa
    const findings = detectCompilerPolicyDriftFromSource(filePath, source);
    return findings.map(f => ({
      ...f,
      filePath,
      source
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Escanea múltiples archivos y detecta policy drifts
 * @param {Array<string>} filePaths - Lista de rutas absolutas
 * @returns {Array} Lista de findings por archivo
 */
export function detectPolicyDriftsBatch(filePaths) {
  return filePaths.flatMap(fp => detectPolicyDrifts(fp));
}

/**
 * Detecta policy drifts en un directorio
 * @param {string} directoryPath - Ruta del directorio
 * @returns {Array} Lista de findings
 */
export function detectPolicyDriftsInDirectory(directoryPath) {
  const findings = [];
  const allFiles = [];

  function walkDir(dir) {
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (!file.startsWith('.') && !file.startsWith('node_modules')) {
            walkDir(fullPath);
          }
        } else if (file.endsWith('.js')) {
          allFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  walkDir(directoryPath);
  
  for (const filePath of allFiles) {
    try {
      const source = readFileSync(filePath, 'utf-8');
      // Usar la misma función que el sistema real usa
      const fileFindings = detectCompilerPolicyDriftFromSource(filePath, source);
      findings.push(...fileFindings.map(f => ({ ...f, filePath, source })));
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  return findings;
}
