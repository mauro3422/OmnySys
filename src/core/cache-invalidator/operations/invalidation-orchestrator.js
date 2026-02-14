/**
 * @fileoverview Invalidation Orchestrator
 * 
 * Orchestrates cache invalidation operations
 * 
 * @module cache-invalidator/operations/invalidation-orchestrator
 */

import { InvalidationStatus, InvalidationEvents, CACHE_KEY_PREFIXES } from '../constants.js';
import { OperationFactory } from '../atomic-operation.js';

/**
 * Create invalidation orchestrator
 * @param {Object} deps - Dependencies
 * @returns {Object} Orchestrator functions
 */
export function createInvalidationOrchestrator(deps) {
  const { ramOps, diskOps, indexOps, config, emit } = deps;

  return {
    /**
     * Create atomic transaction for invalidation
     * @param {string} filePath - File path to invalidate
     * @returns {Object} Transaction
     */
    createTransaction(filePath) {
      const transaction = new deps.AtomicTransaction(filePath, config);

      // Add RAM invalidation for analysis
      transaction.addOperation(
        OperationFactory.createRamInvalidation(
          ramOps,
          `${CACHE_KEY_PREFIXES.ANALYSIS}${filePath}`,
          () => ramOps.createSnapshot(`${CACHE_KEY_PREFIXES.ANALYSIS}${filePath}`)
        )
      );

      // Add RAM invalidation for atoms
      transaction.addOperation(
        OperationFactory.createRamInvalidation(
          ramOps,
          `${CACHE_KEY_PREFIXES.ATOM}${filePath}::*`,
          () => null
        )
      );

      // Add disk deletion
      transaction.addOperation(
        OperationFactory.createDiskDeletion(diskOps, filePath)
      );

      // Add index update
      transaction.addOperation(
        OperationFactory.createIndexUpdate(indexOps, filePath)
      );

      return transaction;
    },

    /**
     * Execute transaction with event emission
     * @param {Object} transaction - Transaction to execute
     * @param {string} filePath - File path
     * @returns {Promise<Object>} Result
     */
    async execute(transaction, filePath) {
      emit(InvalidationEvents.STARTED, { filePath, timestamp: Date.now() });

      try {
        const result = await transaction.execute();
        await indexOps.saveIndex();

        emit(InvalidationEvents.SUCCESS, {
          filePath,
          duration: result.duration,
          timestamp: Date.now()
        });

        return {
          success: true,
          filePath,
          duration: result.duration,
          operationsCompleted: result.operationsCompleted
        };
      } catch (error) {
        emit(InvalidationEvents.FAILED, {
          filePath,
          error: error.message,
          timestamp: Date.now()
        });

        return {
          success: false,
          filePath,
          error: error.message,
          rolledBack: transaction.status === InvalidationStatus.ROLLED_BACK
        };
      }
    }
  };
}
