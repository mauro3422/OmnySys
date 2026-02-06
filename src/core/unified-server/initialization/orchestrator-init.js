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

/**
 * Inicializa componentes del Orchestrator
 * @param {Object} context - { projectPath, omnySysDataPath, eventEmitter }
 * @returns {Promise<Object>} - { stateManager, worker }
 */
export async function initializeOrchestratorComponents(context) {
  const { projectPath, omnySysDataPath, eventEmitter } = context;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Orchestrator Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Initialize StateManager
  const stateManager = new StateManager(
    path.join(omnySysDataPath, 'orchestrator-state.json')
  );
  console.log('  ✓ State manager ready');

  // Initialize Analysis Worker
  const worker = new AnalysisWorker(projectPath, {
    onProgress: (job, progress) => {
      eventEmitter.emit('job:progress', job, progress);
    },
    onComplete: (job, result) => {
      console.log(`  ✅ Completed: ${path.basename(job.filePath)}`);
      eventEmitter.emit('job:complete', job, result);
    },
    onError: (job, error) => {
      console.error(`  ❌ Failed: ${path.basename(job.filePath)}`, error.message);
      eventEmitter.emit('job:error', job, error);
    }
  });
  await worker.initialize();
  console.log('  ✓ Analysis Worker ready\n');

  return { stateManager, worker };
}
