/**
 * @fileoverview env-connections.js
 *
 * Detecta conexiones entre archivos basadas en variables de entorno compartidas
 *
 * @module extractors/static/env-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

function toEnvNameSet(items = []) {
  return new Set(
    items
      .map(item => item?.name || item)
      .filter(Boolean)
  );
}

function normalizeEnvSummary(envVars = []) {
  return {
    names: toEnvNameSet(envVars)
  };
}

function buildEnvIndex(fileResults = {}) {
  const index = new Map();

  for (const [filePath, results] of Object.entries(fileResults)) {
    const summary = normalizeEnvSummary(results?.envVars || []);

    for (const envName of summary.names) {
      if (!index.has(envName)) {
        index.set(envName, []);
      }

      index.get(envName).push({ filePath, summary });
    }
  }

  return index;
}

/**
 * Detecta conexiones entre archivos basadas en process.env compartido
 * @param {Object} fileResults - Mapa de filePath -> {envVars, ...}
 * @returns {Array} - Conexiones detectadas
 */
export function detectEnvConnections(fileResults) {
  const connections = [];
  const index = buildEnvIndex(fileResults);

  for (const [envName, entries] of index) {
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      const entryA = entries[i];

      for (let j = i + 1; j < entries.length; j++) {
        const entryB = entries[j];
        connections.push({
          id: `env_${envName}_${entryA.filePath}_to_${entryB.filePath}`,
          sourceFile: entryA.filePath,
          targetFile: entryB.filePath,
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

  return connections;
}

/**
 * Verifica si dos archivos comparten variables de entorno
 * @param {Array} envA - Variables de entorno del archivo A
 * @param {Array} envB - Variables de entorno del archivo B
 * @returns {boolean}
 */
export function sharesEnvVars(envA, envB) {
  const envSetA = normalizeEnvSummary(envA || []).names;
  const envSetB = normalizeEnvSummary(envB || []).names;

  if (!envSetA.size || !envSetB.size) return false;

  for (const envName of envSetB) {
    if (envSetA.has(envName)) return true;
  }

  return false;
}

/**
 * Obtiene las variables de entorno compartidas entre dos archivos
 * @param {Array} envA - Variables de entorno del archivo A
 * @param {Array} envB - Variables de entorno del archivo B
 * @returns {string[]} - Variables comunes
 */
export function getSharedEnvVars(envA, envB) {
  const envSetA = normalizeEnvSummary(envA || []).names;
  const envSetB = normalizeEnvSummary(envB || []).names;

  if (!envSetA.size || !envSetB.size) return [];

  const shared = [];
  for (const envName of envSetB) {
    if (envSetA.has(envName)) {
      shared.push(envName);
    }
  }

  return shared;
}

