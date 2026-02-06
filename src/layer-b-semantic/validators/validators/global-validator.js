/**
 * @fileoverview global-validator.js
 * 
 * Validación de variables globales del LLM
 * 
 * @module validators/validators/global-validator
 */

import { normalizeGlobalName, extractVariableName } from '../utils/pattern-checkers.js';

/**
 * Sanitiza respuestas del arquetipo global-state usando código real
 * @param {object} response - Respuesta cruda del LLM
 * @param {Set<string>} actualGlobals - Variables globales reales
 * @returns {object|null} - Respuesta sanitizada o null si no hay evidencia
 */
export function sanitizeGlobalStateResponse(response, actualGlobals) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  if (!actualGlobals || actualGlobals.size === 0) {
    return null;
  }

  const rawGlobals = Array.isArray(response.globalVariables) ? response.globalVariables : [];
  const sanitizedGlobals = sanitizeGlobalVariables(rawGlobals, actualGlobals);

  const rawAccess = Array.isArray(response.accessPatterns) ? response.accessPatterns : [];
  const sanitizedAccess = sanitizeAccessPatterns(rawAccess, actualGlobals);

  if (sanitizedGlobals.length === 0 && sanitizedAccess.length === 0) {
    return null;
  }

  return {
    ...response,
    globalVariables: sanitizedGlobals,
    accessPatterns: sanitizedAccess
  };
}

/**
 * Sanitiza variables globales
 * @param {Array} rawGlobals - Variables globales crudas
 * @param {Set<string>} actualGlobals - Variables globales reales
 * @returns {Array}
 */
function sanitizeGlobalVariables(rawGlobals, actualGlobals) {
  return rawGlobals
    .map(entry => {
      if (typeof entry === 'string') {
        return { name: entry };
      }
      return entry;
    })
    .filter(entry => {
      const name = entry?.name;
      if (!name) return false;
      const normalized = normalizeGlobalName(name);
      return actualGlobals.has(normalized);
    });
}

/**
 * Sanitiza patrones de acceso
 * @param {Array} rawAccess - Patrones de acceso crudos
 * @param {Set<string>} actualGlobals - Variables globales reales
 * @returns {Array}
 */
function sanitizeAccessPatterns(rawAccess, actualGlobals) {
  return rawAccess.filter(entry => {
    const variable = extractVariableName(entry);
    if (!variable) return false;
    const normalized = normalizeGlobalName(variable);
    return actualGlobals.has(normalized);
  });
}

/**
 * Valida una sola variable global
 * @param {string} variable - Variable a validar
 * @param {Set<string>} actualGlobals - Variables globales reales
 * @returns {boolean}
 */
export function isValidGlobalVariable(variable, actualGlobals) {
  if (!variable || !actualGlobals) return false;
  const normalized = normalizeGlobalName(variable);
  return actualGlobals.has(normalized);
}
