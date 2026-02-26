/**
 * @fileoverview Wrapper para validación de invariantes
 */

import { checkInvariants } from '../../../../layer-a-static/analyses/tier3/invariant-checker/detector.js';

/**
 * Valida invariantes en los átomos proporcionados
 * @param {Array<Object>} atoms - Átomos a analizar
 * @returns {Array<Object>} - Violaciones encontradas
 */
export function findInvariantViolations(atoms) {
    const allViolations = [];

    atoms.forEach(atom => {
        if (atom.dataFlow) {
            const violations = checkInvariants(atom);
            allViolations.push(...violations);
        }
    });

    return allViolations;
}
