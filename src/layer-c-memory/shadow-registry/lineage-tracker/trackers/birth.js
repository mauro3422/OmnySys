/**
 * @fileoverview Birth Tracker
 * 
 * Registra el nacimiento de nuevos átomos en el sistema.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/trackers/birth
 */

import { detectEvolutionType } from '../validators/evolution.js';

/**
 * Registra el nacimiento de un nuevo átomo
 * 
 * @param {Object} atom - Átomo nuevo
 * @param {Object} [parentShadow] - Sombra padre (si evoluciona de otra)
 * @returns {Object} Información de lineage
 */
export function registerBirth(atom, parentShadow = null) {
  const lineage = {
    generation: 0,
    ancestors: [],
    parentId: null,
    evolutionType: null
  };
  
  if (parentShadow) {
    lineage.generation = parentShadow.lineage.generation + 1;
    lineage.parentId = parentShadow.shadowId;
    lineage.ancestors = [
      parentShadow.shadowId,
      ...(parentShadow.lineage?.ancestors || [])
    ];
    lineage.evolutionType = detectEvolutionType(parentShadow, atom);
  }
  
  return lineage;
}
