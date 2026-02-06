/**
 * @fileoverview file-watcher-init.js
 * 
 * Inicialización del File Watcher
 * 
 * @module unified-server/initialization/file-watcher-init
 */

import { FileWatcher } from '../../file-watcher.js';

/**
 * Inicializa File Watcher para actualizaciones en tiempo real
 * @param {Object} context - { projectPath, batchProcessor, queue, wsManager }
 * @returns {Promise<FileWatcher>}
 */
export async function initializeFileWatcher(context) {
  const { projectPath, batchProcessor, wsManager } = context;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: File Watcher Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
  console.log('  ✓ File Watcher ready\n');
  
  return fileWatcher;
}
