/**
 * @fileoverview Status Route Handler
 * 
 * GET /status - Get current server status
 * 
 * @module orchestrator-server/routes/status-route
 */

import { getHealthStatus, getStateData, serverState } from '../server/state.js';

/**
 * Handle status request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleStatus(req, res) {
  try {
    const stateData = getStateData();
    stateData.health = await getHealthStatus();
    
    await serverState.stateManager?.write(stateData);
    res.json(stateData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
