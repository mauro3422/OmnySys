/**
 * @fileoverview archetype.js
 *
 * Atom archetype detection and recalculation
 *
 * @module pipeline/phases/atom-extraction/metadata/archetype
 */

import { ARCHETYPE_DETECTORS, isTestCallback } from './archetype-rules.js';

/**
 * Detect atom archetype based on metadata.
 *
 * Orden de precedencia (mayor severidad gana):
 *   god-function (10) > fragile-network (8) > hot-path (7) >
 *   dead-function (5) > orchestrator (5) > handler (4) >
 *   factory (4) > initializer (4) > transformer (4) > persister (4) >
 *   class-method (3) > private-utility (3) > utility (2) > constant (1) > standard (1)
 *
 * Usa metadata rica: dna.flowType, dna.semanticFingerprint, derived.couplingScore,
 * patrones de nombre, además de los campos clásicos.
 *
 * @param {Object} atomMetadata - Atom metadata
 * @returns {Object} - Archetype with type, severity, and confidence
 */
export function detectAtomArchetype(atomMetadata) {
  // Ejecutar detectores en orden de precedencia
  for (const detector of ARCHETYPE_DETECTORS) {
    const result = detector(atomMetadata);
    if (result) {
      // Special case: test callbacks return early with specific handling
      if (detector === isTestCallback) {
        return { type: 'test-callback', severity: 1, confidence: 1.0 };
      }
      return result;
    }
  }

  return { type: 'standard', severity: 1, confidence: 1.0 };
}

/**
 * Recalculate archetypes for all atoms with calledBy info
 * @param {Array} atoms - Array of atom metadata
 */
export function recalculateArchetypes(atoms) {
  atoms.forEach(atom => {
    atom.archetype = detectAtomArchetype(atom);
  });
}

export default { detectAtomArchetype, recalculateArchetypes };
