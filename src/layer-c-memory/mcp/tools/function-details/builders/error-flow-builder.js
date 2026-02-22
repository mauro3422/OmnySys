/**
 * @fileoverview Error Flow Builder - Construye sección de flujo de errores
 */

/**
 * Construye la sección de flujo de errores
 * @param {Object} atom - Átomo con metadata de error flow
 * @returns {Object|null} - Sección de error flow o null
 */
export function buildErrorFlowSection(atom) {
  if (!atom.errorFlow) return null;

  const ef = atom.errorFlow;

  return {
    throws: ef.throws || [],
    catches: (ef.catches || []).map(c => ({
      type: c.type,
      variable: c.variable,
      rethrows: c.rethrows,
      logs: c.logs,
      returns: c.returns,
      transforms: c.transforms
    })),
    tryBlocks: (ef.tryBlocks || []).map(tb => ({
      hasCatch: tb.hasCatch,
      hasFinally: tb.hasFinally,
      lines: tb.lines,
      protectedCallsCount: tb.protectedCalls?.length || 0,
      protectedCallsSample: tb.protectedCalls?.slice(0, 10)
    })),
    unhandledCalls: ef.unhandledCalls || [],
    propagation: ef.propagation
  };
}
