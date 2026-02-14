/**
 * @fileoverview Lineage Tracker - Trazabilidad de ADN a través del tiempo
 * 
 * Responsabilidad: Mantener el árbol genealógico de átomos.
 * SSOT: Único lugar donde se registran las relaciones ancestro-descendiente.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker
 * @deprecated Use modular version: lineage-tracker/index.js
 */

// Re-export from modular version for backward compatibility
export {
  registerBirth,
  registerDeath,
  detectEvolutionType,
  calculateInheritance,
  propagateInheritance,
  calculateVibrationScore,
  generateShadowId,
  extractMetadata,
  reconstructLineage,
  compareLineage
} from './lineage-tracker/index.js';
