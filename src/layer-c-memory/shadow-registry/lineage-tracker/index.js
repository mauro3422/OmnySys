/**
 * @fileoverview Lineage Tracker - Trazabilidad de ADN a través del tiempo
 * 
 * Responsabilidad: Mantener el árbol genealógico de átomos.
 * SSOT: Único lugar donde se registran las relaciones ancestro-descendiente.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker
 */

export { registerBirth } from './trackers/birth.js';
export { registerDeath } from './trackers/death.js';
export { detectEvolutionType } from './validators/evolution.js';
export { calculateInheritance, propagateInheritance } from './validators/inheritance.js';
export { calculateVibrationScore } from './utils/vibration.js';
export { generateShadowId } from './storage/id-generator.js';
export { extractMetadata } from './storage/metadata.js';
export { reconstructLineage, compareLineage } from './storage/reconstruction.js';
