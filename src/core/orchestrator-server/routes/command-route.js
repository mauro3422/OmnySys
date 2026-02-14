/**
 * @fileoverview Command Route Handler
 * 
 * POST /command - Queue or prioritize files for analysis
 * 
 * @module orchestrator-server/routes/command-route
 */

import { shouldPreempt } from '../utils/priority-helper.js';

/**
 * Handle command requests
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object} state - Server state
 * @param {Function} processNext - Process next job callback
 * @param {Function} updateState - Update state callback
 */
export async function handleCommand(req, res, state, processNext, updateState) {
  try {
    const { action, filePath, priority = 'low', requestId } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }
    
    if (action === 'prioritize') {
      await handlePrioritize(req, res, state, processNext, updateState);
    } else if (action === 'pause') {
      await handlePause(req, res, state, updateState);
    } else if (action === 'resume') {
      await handleResume(req, res, state, processNext, updateState);
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handle prioritize action
 */
async function handlePrioritize(req, res, state, processNext, updateState) {
  const { filePath, priority = 'low', requestId } = req.body;
  
  // Check if already analyzed
  const isAnalyzed = await state.worker.isAnalyzed(filePath);
  if (isAnalyzed) {
    return res.json({
      status: 'completed',
      filePath,
      requestId,
      message: 'Already analyzed'
    });
  }
  
  // Queue with priority
  const position = state.queue.enqueue(filePath, priority);
  state.stats.totalQueued++;
  
  // Check if should preempt current job
  if (priority === 'critical' && state.currentJob) {
    if (shouldPreempt(priority, state.currentJob.priority)) {
      await state.worker.pause();
      state.queue.enqueue(state.currentJob.filePath, state.currentJob.priority);
      state.currentJob = null;
    }
  }
  
  // Start processing if no current job
  if (!state.currentJob) {
    processNext(updateState);
  }
  
  await updateState();
  
  res.json({
    status: position === 0 ? 'analyzing' : 'queued',
    filePath,
    priority,
    position,
    estimatedTime: calculateETA(position, state.stats.avgTime),
    requestId
  });
}

/**
 * Handle pause action
 */
async function handlePause(req, res, state, updateState) {
  state.isRunning = false;
  await state.worker.pause();
  await updateState();
  res.json({ status: 'paused' });
}

/**
 * Handle resume action
 */
async function handleResume(req, res, state, processNext, updateState) {
  state.isRunning = true;
  await updateState();
  processNext(updateState);
  res.json({ status: 'resumed' });
}

/**
 * Calculate ETA for a position
 */
function calculateETA(position, avgTime) {
  const time = avgTime || 3000;
  return position * time;
}
