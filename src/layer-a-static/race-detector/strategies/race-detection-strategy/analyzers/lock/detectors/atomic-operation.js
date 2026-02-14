/**
 * @fileoverview Atomic Operation Detector
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/atomic-operation
 */

/**
 * Detecta operaciones atómicas
 * @param {string} context - Contexto de código
 * @param {Object} access - Punto de acceso
 * @returns {LockInfo|null}
 */
export function detectAtomicOperation(context, access) {
  const atomicPattern = /(?:Atomic\w+|atomic\s*\{|compareAndSet|getAndSet)/i;

  if (atomicPattern.test(context)) {
    return {
      type: 'atomic',
      target: access.name || 'unknown',
      scope: 'operation',
      line: access.line,
      column: access.column
    };
  }

  return null;
}
