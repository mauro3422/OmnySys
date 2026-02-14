/**
 * @fileoverview Health Route Handler
 * 
 * GET /health - Health check for AI
 * 
 * @module orchestrator-server/routes/health-route
 */

import { getHealthStatus } from '../server/state.js';

/**
 * Handle health check request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleHealth(req, res) {
  try {
    const health = await getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
}
