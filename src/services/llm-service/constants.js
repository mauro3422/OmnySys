/**
 * @fileoverview constants.js
 *
 * Circuit Breaker States and other constants for LLM Service.
 *
 * @module llm-service/constants
 * @version 0.9.4
 * @since 0.7.0
 */

/**
 * Circuit breaker states for provider health management.
 * @readonly
 * @enum {string}
 */
export const CB_STATE = {
  /** Normal operation - requests are allowed through. */
  CLOSED: 'CLOSED',
  
  /** Failure threshold exceeded - requests are blocked. */
  OPEN: 'OPEN',
  
  /** Testing if service has recovered - limited requests allowed. */
  HALF_OPEN: 'HALF_OPEN'
};

export default CB_STATE;
