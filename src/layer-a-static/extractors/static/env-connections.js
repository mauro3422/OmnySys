/**
 * @fileoverview env-connections.js
 *
 * Detecta conexiones entre archivos basadas en variables de entorno compartidas
 *
 * @module extractors/static/env-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

/**
 * Detecta conexiones entre archivos basadas en process.env compartido
 * @param {Object} fileResults - Mapa de filePath -> {envVars, ...}
 * @returns {Array} - Conexiones detectadas
 */
export function detectEnvConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);

  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const envA = resultsA.envVars || [];

    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const envB = resultsB.envVars || [];

      // Normalizar a arrays de strings
      const envSetA = new Set(envA.map(e => e.name || e));
      const envNamesB = envB.map(e => e.name || e);
      const commonEnv = envNamesB.filter(e => envSetA.has(e));

      if (commonEnv.length > 0) {
        for (const envName of commonEnv) {
          connections.push({
            id: `env_${envName}_${fileA}_to_${fileB}`,
            sourceFile: fileA,
            targetFile: fileB,
            type: ConnectionType.SHARED_ENV,
            via: 'env-variable',
            envVar: envName,
            direction: 'both read',
            confidence: DEFAULT_CONFIDENCE,
            detectedBy: 'env-extractor',
            reason: `Both files read process.env.${envName}`
          });
        }
      }
    }
  }

  return connections;
}

/**
 * Verifica si dos archivos comparten variables de entorno
 * @param {Array} envA - Variables de entorno del archivo A
 * @param {Array} envB - Variables de entorno del archivo B
 * @returns {boolean}
 */
export function sharesEnvVars(envA, envB) {
  if (!envA?.length || !envB?.length) return false;

  const envSetA = new Set(envA.map(e => e.name || e));
  const envNamesB = envB.map(e => e.name || e);

  return envNamesB.some(e => envSetA.has(e));
}

/**
 * Obtiene las variables de entorno compartidas entre dos archivos
 * @param {Array} envA - Variables de entorno del archivo A
 * @param {Array} envB - Variables de entorno del archivo B
 * @returns {string[]} - Variables comunes
 */
export function getSharedEnvVars(envA, envB) {
  if (!envA?.length || !envB?.length) return [];

  const envSetA = new Set(envA.map(e => e.name || e));
  const envNamesB = envB.map(e => e.name || e);

  return envNamesB.filter(e => envSetA.has(e));
}
