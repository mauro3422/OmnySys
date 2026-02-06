/**
 * @fileoverview priority-calculator.js
 * 
 * Servicio: Calcula prioridad de cambios según impacto
 * 
 * @module batch-processor/priority-calculator
 */

import { Priority, ChangeType } from './constants.js';

/**
 * Calcula prioridad según tipo de cambio y metadatos
 * @param {string} filePath - Ruta del archivo
 * @param {string} changeType - Tipo de cambio
 * @param {Object} options - Opciones del cambio
 * @returns {number} - Valor de prioridad
 */
export function calculatePriority(filePath, changeType, options = {}) {
  // Prioridad explícita toma precedencia
  if (options.priority !== undefined) {
    return options.priority;
  }

  // Eliminar es crítico (rompe dependencias)
  if (changeType === ChangeType.DELETED) {
    return Priority.CRITICAL;
  }

  // Crear es alto (nuevo código con posibles exports)
  if (changeType === ChangeType.CREATED) {
    return Priority.HIGH;
  }

  // Cambios en exports = potencial breaking change
  if (options.exportChanges?.length > 0) {
    return Priority.HIGH;
  }

  // Muchos dependientes = cambio de alto impacto
  if (options.dependentCount > 20) {
    return Priority.CRITICAL;
  }
  if (options.dependentCount > 5) {
    return Priority.HIGH;
  }

  // Cambios en imports = impacto medio
  if (options.importChanges?.length > 0) {
    return Priority.MEDIUM;
  }

  // Por defecto: bajo
  return Priority.LOW;
}

/**
 * Convierte prioridad numérica a string
 * @param {number} priority - Valor de prioridad
 * @returns {string}
 */
export function priorityToString(priority) {
  switch (priority) {
    case Priority.CRITICAL: return 'critical';
    case Priority.HIGH: return 'high';
    case Priority.MEDIUM: return 'medium';
    case Priority.LOW: return 'low';
    default: return 'low';
  }
}

/**
 * Convierte string de prioridad a numérica
 * @param {string} str - String de prioridad
 * @returns {number}
 */
export function stringToPriority(str) {
  switch (str?.toLowerCase()) {
    case 'critical': return Priority.CRITICAL;
    case 'high': return Priority.HIGH;
    case 'medium': return Priority.MEDIUM;
    case 'low': return Priority.LOW;
    default: return Priority.LOW;
  }
}
