/**
 * @fileoverview status.js
 * 
 * Status and health route handlers
 * 
 * @module orchestrator-server/routes/status
 */

import { state, getHealthStatus } from '../server/state.js';

/**
 * GET /status - Obtener estado actual
 */
export async function handleStatus(req, res) {
  try {
    const stateData = await state.stateManager.read();
    res.json(stateData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /health - Health check para IA
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

/**
 * GET /queue - Ver cola completa
 */
export function handleQueue(req, res) {
  res.json({
    current: state.currentJob,
    queue: state.queue.getAll(),
    total: state.queue.size()
  });
}

/**
 * POST /restart - Reiniciar orchestrator
 */
export async function handleRestart(req, res, logger) {
  logger.info('🔄 Restarting orchestrator...');
  
  try {
    await state.worker.stop();
    state.queue.clear();
    state.currentJob = null;
    state.isRunning = true;
    
    await state.worker.initialize();
    
    logger.info('✅ Orchestrator restarted');
    res.json({ status: 'restarted' });
    
  } catch (error) {
    logger.error('Error restarting:', error);
    res.status(500).json({ error: error.message });
  }
}
