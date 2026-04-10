/**
 * Shared restart utilities.
 * Extracted to avoid conceptual duplication between restart-runtime-handler.js
 * and restart-runtime-mode-handlers.js.
 */

/**
 * Detects if the runtime is running behind a proxy (worker process).
 * Used to decide whether to delegate restarts to the parent process.
 */
export function isProxyMode() {
  return process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';
}
