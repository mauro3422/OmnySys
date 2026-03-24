/**
 * @fileoverview ETA helpers for orchestrator queues.
 *
 * @module orchestrator-server/utils/eta
 */

/**
 * Estimate queue wait time.
 *
 * @param {number} position - Position in queue.
 * @param {number} avgTime - Average processing time per job in ms.
 * @returns {number} Estimated wait time in ms.
 */
export function estimateQueueTime(position, avgTime = 3000) {
  return position * avgTime;
}

export default estimateQueueTime;
