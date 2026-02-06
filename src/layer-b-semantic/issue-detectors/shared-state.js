/**
 * @fileoverview shared-state.js
 * 
 * Detecta problemas con shared state:
 * - undefined: leído pero nunca escrito
 * - dead: escrito pero nunca leído
 * 
 * @module issue-detectors/shared-state
 */

/**
 * Detecta shared state leído pero nunca escrito (undefined)
 * @param {object} globalState - Estado global indexado
 * @returns {Array} - Issues encontrados
 */
export function detectUndefinedSharedState(globalState) {
  const issues = [];

  for (const [property, readers] of Object.entries(globalState.sharedState.reads)) {
    const writers = globalState.sharedState.writes[property];

    if (!writers || writers.length === 0) {
      issues.push({
        type: 'undefined-shared-state',
        property,
        readers,
        severity: 'high',
        reason: `Property "${property}" is read but never written`,
        suggestion: 'Initialize this property or fix typo in property name'
      });
    }
  }

  return issues;
}

/**
 * Detecta shared state escrito pero nunca leído (código muerto)
 * @param {object} globalState - Estado global indexado
 * @returns {Array} - Issues encontrados
 */
export function detectDeadSharedState(globalState) {
  const issues = [];

  for (const [property, writers] of Object.entries(globalState.sharedState.writes)) {
    const readers = globalState.sharedState.reads[property];

    if (!readers || readers.length === 0) {
      issues.push({
        type: 'dead-shared-state',
        property,
        writers,
        severity: 'low',
        reason: `Property "${property}" is written but never read`,
        suggestion: 'Remove unused code or add reader'
      });
    }
  }

  return issues;
}
