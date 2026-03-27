/**
 * @fileoverview Risk Helpers - Helpers para análisis de riesgo
 * 
 * @module atomic/helpers
 */

import { buildMetricCategories, lookupCatalogValue } from './catalog-helpers.js';

/**
 * Obtiene la razón del riesgo basada en el arquetipo
 * @param {string} archetypeType - Tipo de arquetipo
 * @returns {string} Razón del riesgo
 */
export function getRiskReason(archetypeType) {
  const reasons = {
    'hot-path': 'Function is called from multiple places',
    'fragile-network': 'Function makes network calls without proper error handling',
    'god-function': 'Function is too complex',
    'dead-function': 'Function is not used anywhere',
    'default': 'Standard function'
  };
  return lookupCatalogValue(archetypeType, reasons);
}

/**
 * Obtiene el nivel de riesgo basado en severidad
 * @param {number} severity - Severidad (0-10)
 * @returns {string} Nivel de riesgo
 */
export function getRiskLevel(severity) {
  return buildMetricCategories(severity);
}

/**
 * Calcula métricas de riesgo para un átomo
 * @param {Object} atom - Datos del átomo
 * @returns {Object} Métricas de riesgo
 */
export function calculateRiskMetrics(atom) {
  return {
    level: getRiskLevel(atom.archetype?.severity),
    archetype: atom.archetype?.type,
    severity: atom.archetype?.severity,
    reason: getRiskReason(atom.archetype?.type)
  };
}
