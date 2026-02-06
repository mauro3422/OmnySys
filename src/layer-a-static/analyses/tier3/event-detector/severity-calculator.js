/**
 * @fileoverview severity-calculator.js
 * 
 * Cálculo de severidad de eventos
 * 
 * @module analyses/tier3/event-detector/severity-calculator
 */

import { CRITICAL_EVENT_PATTERNS, Severity, HIGH_SEVERITY_LISTENER_THRESHOLD } from './constants.js';

/**
 * Calcula severidad basada en patrón de eventos
 * @param {string} eventName - Nombre del evento
 * @param {number} listenerCount - Cantidad de listeners
 * @param {number} emitterCount - Cantidad de emitters
 * @returns {string} - Severity level
 */
export function calculateEventSeverity(eventName, listenerCount, emitterCount) {
  // Si hay múltiples emitters y listeners -> CRITICAL
  if (emitterCount > 1 && listenerCount > 1) {
    return Severity.CRITICAL;
  }

  // Eventos críticos por nombre
  if (isCriticalEventName(eventName)) {
    return Severity.HIGH;
  }

  // Múltiples listeners
  if (listenerCount > HIGH_SEVERITY_LISTENER_THRESHOLD) {
    return Severity.HIGH;
  }

  return Severity.MEDIUM;
}

/**
 * Verifica si un nombre de evento indica criticidad
 * @param {string} eventName - Nombre del evento
 * @returns {boolean}
 */
export function isCriticalEventName(eventName) {
  if (!eventName) return false;
  const lowerName = eventName.toLowerCase();
  return CRITICAL_EVENT_PATTERNS.some(pattern => lowerName.includes(pattern));
}

/**
 * Calcula confianza promedio de una conexión
 * @param {number} existingAvg - Promedio existente
 * @param {number} newConfidence - Nueva confianza
 * @param {number} count - Cantidad de evidencias
 * @returns {number}
 */
export function calculateAverageConfidence(existingAvg, newConfidence, count) {
  if (count <= 1) return newConfidence;
  return (existingAvg * (count - 1) + newConfidence) / count;
}

/**
 * Determina severidad general de una conexión
 * @param {Array} eventNames - Nombres de eventos
 * @param {number} eventCount - Cantidad de eventos
 * @returns {string}
 */
export function determineConnectionSeverity(eventNames, eventCount) {
  if (eventNames.some(isCriticalEventName)) {
    return Severity.HIGH;
  }
  
  if (eventCount > HIGH_SEVERITY_LISTENER_THRESHOLD) {
    return Severity.HIGH;
  }
  
  return Severity.MEDIUM;
}
