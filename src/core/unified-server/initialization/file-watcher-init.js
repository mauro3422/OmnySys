/**
 * @fileoverview file-watcher-init.js
 * 
 * Inicialización del File Watcher
 * 
 * @module unified-server/initialization/file-watcher-init
 */

import { FileWatcher } from '../../file-watcher/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file:watcher:init');



/**
 * Inicializa File Watcher para actualizaciones en tiempo real
 * @param {Object} context - { projectPath, batchProcessor, queue, wsManager }
 * @returns {Promise<FileWatcher>}
 */
export async function initializeFileWatcher(context) {
  const { projectPath, batchProcessor, wsManager } = context;
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 4: File Watcher Initialization');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const fileWatcher = new FileWatcher(projectPath, {
    debounceMs: 500,
    batchDelayMs: 1000,
    maxConcurrent: 3,
    verbose: true
  });

  fileWatcher.on('file:created', (event) => {
    batchProcessor?.addChange(event.filePath, 'created');
  });

  fileWatcher.on('file:modified', (event) => {
    batchProcessor?.addChange(event.filePath, 'modified');
  });

  fileWatcher.on('file:deleted', (event) => {
    batchProcessor?.addChange(event.filePath, 'deleted');
  });

  await fileWatcher.initialize();
  logger.info('  ✓ File Watcher ready\n');
  
  return fileWatcher;
}
