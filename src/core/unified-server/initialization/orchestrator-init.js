/**
 * @fileoverview orchestrator-init.js
 * 
 * Inicialización del Orchestrator
 * 
 * @module unified-server/initialization/orchestrator-init
 */

import path from 'path';
import { StateManager } from '../../state-manager.js';
import { AnalysisWorker } from '../../analysis-worker.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:orchestrator:init');



/**
 * Inicializa componentes del Orchestrator
 * @param {Object} context - { projectPath, omnySysDataPath, eventEmitter }
 * @returns {Promise<Object>} - { stateManager, worker }
 */
export async function initializeOrchestratorComponents(context) {
  const { projectPath, omnySysDataPath, eventEmitter } = context;
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 2: Orchestrator Initialization');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Initialize StateManager
  const stateManager = new StateManager(
    path.join(omnySysDataPath, 'orchestrator-state.json')
  );
  logger.info('  ✓ State manager ready');

  // Initialize Analysis Worker
  const worker = new AnalysisWorker(projectPath, {
    onProgress: (job, progress) => {
      eventEmitter.emit('job:progress', job, progress);
    },
    onComplete: (job, result) => {
      logger.info(`  ✅ Completed: ${path.basename(job.filePath)}`);
      eventEmitter.emit('job:complete', job, result);
    },
    onError: (job, error) => {
      logger.error(`  ❌ Failed: ${path.basename(job.filePath)}`, error.message);
      eventEmitter.emit('job:error', job, error);
    }
  });
  await worker.initialize();
  logger.info('  ✓ Analysis Worker ready\n');

  return { stateManager, worker };
}
