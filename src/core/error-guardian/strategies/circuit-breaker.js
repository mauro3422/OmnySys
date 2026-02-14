/**
 * @fileoverview circuit-breaker.js
 * 
 * Strategy Pattern: Circuit Breaker
 * 
 * Prevents cascade failures by temporarily blocking operations
 * that are likely to fail. Implements CLOSED, OPEN, and HALF_OPEN states.
 * 
 * @module core/error-guardian/strategies/circuit-breaker
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:circuit');

/**
 * Circuit breaker states
 */
export const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Failing, rejecting calls
  HALF_OPEN: 'HALF_OPEN'  // Testing if service recovered
};

/**
 * Default configuration for circuit breaker
 */
export const CIRCUIT_CONFIG = {
  failureThreshold: 5,        // Failures before opening
  resetTimeout: 30000,        // ms before attempting reset
  halfOpenMaxCalls: 3,        // Test calls in half-open state
  successThreshold: 2         // Successes needed to close
};

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  constructor(config = {}) {
    this.config = { ...CIRCUIT_CONFIG, ...config };
    this.circuits = new Map();
  }

  /**
   * Get or create circuit for an operation
   * @param {string} operationId - Circuit identifier
   * @returns {Object} - Circuit state object
   */
  getCircuit(operationId) {
    if (!this.circuits.has(operationId)) {
      this.circuits.set(operationId, {
        state: CIRCUIT_STATE.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        halfOpenCalls: 0,
        totalCalls: 0,
        totalFailures: 0
      });
    }
    return this.circuits.get(operationId);
  }

  /**
   * Execute an operation with circuit breaker protection
   * @param {string} operationId - Circuit identifier
   * @param {Function} operation - Async function to execute
   * @returns {Promise<*>} - Operation result
   */
  async execute(operationId, operation) {
    const circuit = this.getCircuit(operationId);

    // Check if circuit is OPEN
    if (circuit.state === CIRCUIT_STATE.OPEN) {
      const now = Date.now();
      const timeSinceLastFailure = now - (circuit.lastFailureTime || 0);

      if (timeSinceLastFailure >= this.config.resetTimeout) {
        logger.info(`🔧 Circuit ${operationId} transitioning to HALF_OPEN`);
        circuit.state = CIRCUIT_STATE.HALF_OPEN;
        circuit.halfOpenCalls = 0;
        circuit.successes = 0;
      } else {
        const remainingMs = this.config.resetTimeout - timeSinceLastFailure;
        throw new Error(
          `Circuit breaker OPEN for ${operationId}. Try again in ${remainingMs}ms`
        );
      }
    }

    // Check half-open call limit
    if (circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      if (circuit.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error(
          `Circuit breaker HALF_OPEN for ${operationId}, max test calls reached`
        );
      }
      circuit.halfOpenCalls++;
    }

    // Execute the operation
    circuit.totalCalls++;
    
    try {
      const result = await operation();
      this.onSuccess(operationId);
      return result;
    } catch (error) {
      this.onFailure(operationId);
      throw error;
    }
  }

  /**
   * Handle successful operation
   * @param {string} operationId - Circuit identifier
   */
  onSuccess(operationId) {
    const circuit = this.getCircuit(operationId);

    if (circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      circuit.successes++;
      
      if (circuit.successes >= this.config.successThreshold) {
        logger.info(`✅ Circuit ${operationId} CLOSED (recovered)`);
        circuit.state = CIRCUIT_STATE.CLOSED;
        circuit.failures = 0;
        circuit.halfOpenCalls = 0;
      }
    } else {
      circuit.failures = 0;
    }
  }

  /**
   * Handle failed operation
   * @param {string} operationId - Circuit identifier
   */
  onFailure(operationId) {
    const circuit = this.getCircuit(operationId);
    
    circuit.failures++;
    circuit.totalFailures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      // Failed in half-open, go back to open
      logger.warn(`⚠️  Circuit ${operationId} back to OPEN (recovery failed)`);
      circuit.state = CIRCUIT_STATE.OPEN;
      circuit.halfOpenCalls = 0;
    } else if (circuit.failures >= this.config.failureThreshold) {
      // Too many failures, open the circuit
      logger.error(`🔴 Circuit ${operationId} OPENED after ${circuit.failures} failures`);
      circuit.state = CIRCUIT_STATE.OPEN;
    }
  }

  /**
   * Get circuit state information
   * @param {string} operationId - Circuit identifier
   * @returns {Object}
   */
  getState(operationId) {
    const circuit = this.getCircuit(operationId);
    return {
      operationId,
      state: circuit.state,
      failures: circuit.failures,
      totalCalls: circuit.totalCalls,
      totalFailures: circuit.totalFailures,
      lastFailureTime: circuit.lastFailureTime,
      health: this.calculateHealth(circuit)
    };
  }

  /**
   * Calculate health percentage for a circuit
   * @param {Object} circuit - Circuit state
   * @returns {number} - Health percentage (0-100)
   */
  calculateHealth(circuit) {
    if (circuit.totalCalls === 0) return 100;
    const successRate = (circuit.totalCalls - circuit.totalFailures) / circuit.totalCalls;
    return Math.round(successRate * 100);
  }

  /**
   * Get all circuit states
   * @returns {Array<Object>}
   */
  getAllStates() {
    return Array.from(this.circuits.keys()).map(id => this.getState(id));
  }

  /**
   * Force a circuit to specific state (for testing/recovery)
   * @param {string} operationId - Circuit identifier
   * @param {string} state - State to force
   */
  forceState(operationId, state) {
    const circuit = this.getCircuit(operationId);
    circuit.state = state;
    
    if (state === CIRCUIT_STATE.CLOSED) {
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.halfOpenCalls = 0;
    }
    
    logger.info(`🔧 Circuit ${operationId} forced to ${state}`);
  }

  /**
   * Reset a circuit to initial state
   * @param {string} operationId - Circuit identifier
   */
  reset(operationId) {
    this.circuits.delete(operationId);
    logger.info(`🔄 Circuit ${operationId} reset`);
  }

  /**
   * Reset all circuits
   */
  resetAll() {
    this.circuits.clear();
    logger.info('🔄 All circuits reset');
  }
}

export default CircuitBreaker;
