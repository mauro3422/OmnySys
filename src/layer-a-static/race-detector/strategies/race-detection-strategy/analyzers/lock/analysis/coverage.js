/**
 * @fileoverview Lock Coverage Analysis
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/coverage
 */

/**
 * Analiza la cobertura de locks para un conjunto de accesos
 * @param {Array} accesses - Array de puntos de acceso
 * @param {Object} project - Datos del proyecto
 * @param {Function} getLockProtection - Función para obtener protección de lock
 * @param {Function} findAtomForAccess - Función para encontrar átomo
 * @returns {Object} - Análisis de cobertura
 */
export function analyzeLockCoverage(accesses, project, getLockProtection, findAtomForAccess) {
  const protected_ = [];
  const unprotected = [];

  for (const access of accesses) {
    const atom = findAtomForAccess(access, project);
    const lockInfo = getLockProtection(access, atom, project);

    if (lockInfo) {
      protected_.push({ access, lock: lockInfo });
    } else {
      unprotected.push({ access });
    }
  }

  return {
    total: accesses.length,
    protected: protected_.length,
    unprotected: unprotected.length,
    protectedAccesses: protected_,
    unprotectedAccesses: unprotected,
    coverageRatio: accesses.length > 0 ? protected_.length / accesses.length : 0
  };
}
