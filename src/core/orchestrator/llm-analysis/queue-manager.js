import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:analysis:queue');

/**
 * Inicializa el sistema de cola para análisis LLM
 * @param {Object} orchestrator - Instancia del orchestrator (this)
 */
export function initializeQueue(orchestrator) {
  orchestrator.totalFilesToAnalyze = 0;
  orchestrator.processedFiles = new Set();
  orchestrator.analysisCompleteEmitted = false;
}

/**
 * Agrega archivos a la cola con prioridad
 * @param {Object} orchestrator - Instancia del orchestrator
 * @param {Array} files - Archivos que necesitan LLM
 */
export function enqueueFiles(orchestrator, files) {
  for (const file of files) {
    orchestrator.queue.enqueueJob({
      filePath: file.filePath,
      needsLLM: true,
      archetypes: file.archetypes
    }, file.priority);

    logger.info(`   ➕ Added to queue: ${file.filePath} (${file.priority}) - ${file.archetypes.join(', ')}`);
  }

  orchestrator.totalFilesToAnalyze = files.length;
  logger.info(`   ✅ ${files.length} files added to analysis queue`);
}

/**
 * Inicia el procesamiento de la cola
 * @param {Object} orchestrator - Instancia del orchestrator
 * @param {number} maxConcurrent - Número máximo de análisis concurrentes
 */
export function startQueueProcessing(orchestrator, maxConcurrent = 2) {
  const concurrent = Math.min(maxConcurrent, 2); // Max 2 for GPU
  
  logger.info('   🚀 Starting queue processing...');
  
  for (let i = 0; i < concurrent; i++) {
    orchestrator._processNext();
  }
}

/**
 * Maneja el caso donde no hay archivos que necesiten LLM
 * @param {Object} orchestrator - Instancia del orchestrator
 * @param {number} totalFiles - Total de archivos en el índice
 */
export function handleNoFilesNeedLLM(orchestrator, totalFiles) {
  logger.info('   ℹ️  No files need LLM analysis (static analysis sufficient)');
  logger.info('   ✅ Emitting analysis:complete event');
  
  orchestrator.emit('analysis:complete', {
    iterations: 0,
    totalFiles: orchestrator.indexedFiles?.size || totalFiles,
    issues: { stats: { totalIssues: 0 } }
  });
}
