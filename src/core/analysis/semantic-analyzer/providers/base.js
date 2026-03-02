/**
 * @fileoverview Base class for semantic language providers.
 */

export class BaseSemanticProvider {
  /**
   * Analyzes an atom's code semantically (sync).
   * @param {Object} atom - Atom metadata.
   * @param {string} code - Function source code.
   * @param {Object} options - Options.
   * @returns {Object}
   */
  analyze(atom, code, options) {
    throw new Error('Not implemented');
  }

  /**
   * Standardizes the output to the OmnySys semantic format.
   */
  standardize(results) {
    return {
      hasReturnValue: !!results.hasReturnValue,
      returnLiterals: results.returnLiterals || [],
      mutatesParams: results.mutatesParams || [],
      usesThisContext: !!results.usesThisContext,
      paramHints: results.paramHints || {},
      isPure: results.isPure === undefined ? null : results.isPure,
      complexity: results.complexity || 0,
      asyncWaterfall: results.asyncWaterfall || []
    };
  }
}
