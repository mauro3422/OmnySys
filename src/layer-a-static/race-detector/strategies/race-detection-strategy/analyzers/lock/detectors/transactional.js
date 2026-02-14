/**
 * @fileoverview Transactional Context Detector
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/transactional
 */

/**
 * Detecta contextos transaccionales
 * @param {string} context - Contexto de código
 * @param {Object} access - Punto de acceso
 * @returns {LockInfo|null}
 */
export function detectTransactionalContext(context, access) {
  const transactionPattern = /(?:@Transactional|transaction\s*\{|BEGIN\s+TRANSACTION)/i;

  if (transactionPattern.test(context)) {
    return {
      type: 'transaction',
      target: access.name || 'unknown',
      scope: 'transaction',
      line: access.line,
      column: access.column
    };
  }

  return null;
}
