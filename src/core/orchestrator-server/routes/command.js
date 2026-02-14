/**
 * @fileoverview command.js
 * 
 * Command route handlers
 * 
 * @module orchestrator-server/routes/command
 */

import path from 'path';
import { state, updateState, processNext } from '../server/state.js';

function getPriorityLevel(priority) {
  const levels = { critical: 4, high: 3, medium: 2, low: 1 };
  return levels[priority] || 0;
}

function calculateETA(position) {
  const avgTime = state.stats.avgTime || 3000;
  return position * avgTime;
}

/**
 * POST /command - Encolar o priorizar archivo
 */
export async function handleCommand(req, res, logger) {
  try {
    const { action, filePath, priority = 'low', requestId } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }
    
    if (action === 'prioritize') {
      const isAnalyzed = await state.worker.isAnalyzed(filePath);
      if (isAnalyzed) {
        return res.json({
          status: 'completed',
          filePath,
          requestId,
          message: 'Already analyzed'
        });
      }
      
      const position = state.queue.enqueue(filePath, priority);
      state.stats.totalQueued++;
      
      logger.info(`📥 Queued: ${path.basename(filePath)} [${priority}] at position ${position}`);
      
      if (priority === 'critical' && state.currentJob) {
        const currentPriority = getPriorityLevel(state.currentJob.priority);
        const newPriority = getPriorityLevel(priority);
        
        if (newPriority > currentPriority) {
          logger.info(`⏸️  Pausing current job to prioritize ${path.basename(filePath)}`);
          await state.worker.pause();
          state.queue.enqueue(state.currentJob.filePath, state.currentJob.priority);
          state.currentJob = null;
        }
      }
      
      if (!state.currentJob) {
        processNext(logger);
      }
      
      await updateState();
      
      res.json({
        status: position === 0 ? 'analyzing' : 'queued',
        filePath,
        priority,
        position,
        estimatedTime: calculateETA(position),
        requestId
      });
      
    } else if (action === 'pause') {
      state.isRunning = false;
      await state.worker.pause();
      await updateState();
      res.json({ status: 'paused' });
      
    } else if (action === 'resume') {
      state.isRunning = true;
      await updateState();
      processNext(logger);
      res.json({ status: 'resumed' });
      
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
    
  } catch (error) {
    logger.error('Error in /command:', error);
    res.status(500).json({ error: error.message });
  }
}
