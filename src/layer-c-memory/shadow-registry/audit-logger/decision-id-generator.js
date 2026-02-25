/**
 * @fileoverview Decision ID Generator
 *
 * Genera IDs únicos para decisiones de auditoría.
 *
 * @module layer-c-memory/shadow-registry/audit-logger/decision-id-generator
 */

/**
 * Genera ID único para decisión
 * @returns {string} ID único con formato dec_{timestamp}_{random}
 */
export function generateDecisionId() {
  return `dec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default generateDecisionId;
