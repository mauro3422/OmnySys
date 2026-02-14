/**
 * @fileoverview Restart Route Handler
 * 
 * POST /restart - Restart orchestrator
 * 
 * @module orchestrator-server/routes/restart-route
 */

import { restart, serverState } from '../server/state.js';

/**
 * Handle restart request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} updateState - Update state callback
 * @param {Function} processNext - Process next callback
 */
export async function handleRestart(req, res, updateState, processNext) {
  try {
    await restart(updateState, processNext);
    res.json({ status: 'restarted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
