/**
 * @fileoverview ID Generator
 * 
 * Genera IDs únicos para sombras.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/storage/id-generator
 */

/**
 * Genera ID único para sombra
 * @returns {string} ID único
 */
export function generateShadowId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `shadow_${timestamp}_${random}`;
}
