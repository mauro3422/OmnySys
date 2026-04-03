/**
 * @fileoverview Canonical async error boundary helper.
 *
 * Small wrapper for async flows that need explicit boundary semantics without
 * duplicating try/catch boilerplate across runtime modules.
 */

export async function runAsyncBoundary(operationName, runner, options = {}) {
  const logger = options.logger || null;
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback')
    ? options.fallback
    : undefined;

  try {
    return await runner();
  } catch (error) {
    const message = options.message || `${operationName} failed`;
    logger?.error?.(`[${operationName}] ${message}: ${error.message || error}`);
    if (typeof options.onError === 'function') {
      await options.onError(error);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

export default {
  runAsyncBoundary
};
