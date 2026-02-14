/**
 * @fileoverview Mitigation Analysis
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/mitigation
 */

/**
 * Verifica si una race condition está mitigada por locking
 * @param {Object} race - Objeto de race condition
 * @param {Object} project - Datos del proyecto
 * @param {Object} analyzers - Objeto con funciones de análisis
 * @returns {Object} - Análisis de mitigación
 */
export function checkMitigation(race, project, analyzers) {
  const { haveCommonLock, getLockProtection, findAtomForAccess } = analyzers;

  const mitigation = {
    hasMitigation: false,
    type: null,
    details: []
  };

  const [access1, access2] = race.accesses || [];
  if (!access1 || !access2) return mitigation;

  const atom1 = findAtomForAccess(access1, project);
  const atom2 = findAtomForAccess(access2, project);

  // Check for common lock
  if (haveCommonLock(access1, access2, atom1, atom2, project)) {
    mitigation.hasMitigation = true;
    mitigation.type = 'common_lock';
    mitigation.details.push('Both accesses protected by same lock');
  }

  // Check for atomic operations
  const lock1 = getLockProtection(access1, atom1, project);
  const lock2 = getLockProtection(access2, atom2, project);

  if (lock1?.type === 'atomic' && lock2?.type === 'atomic') {
    mitigation.hasMitigation = true;
    mitigation.type = 'atomic_operations';
    mitigation.details.push('Both accesses use atomic operations');
  }

  // Check for transaction isolation
  if (lock1?.type === 'transaction' || lock2?.type === 'transaction') {
    mitigation.hasMitigation = true;
    mitigation.type = 'transaction_isolation';
    mitigation.details.push('Access protected by transaction');
  }

  return mitigation;
}
