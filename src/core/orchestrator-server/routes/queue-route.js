/**
 * @fileoverview Queue Route Handler
 * 
 * GET /queue - View complete queue
 * 
 * @module orchestrator-server/routes/queue-route
 */

import { serverState } from '../server/state.js';

/**
 * Handle queue request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export function handleQueue(req, res) {
  res.json({
    current: serverState.currentJob,
    queue: serverState.queue.getAll(),
    total: serverState.queue.size()
  });
}
