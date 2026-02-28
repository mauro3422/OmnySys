import fs from 'fs/promises';
import path from 'path';
import { safeReadJson } from '#utils/json-safe.js';
import { createLogger } from '../../shared/logger-system.js';
import { LLMAnalyzer } from '../../layer-b-semantic/llm-analyzer/index.js';
import { processFileBatch } from './file-processor.js';
import { initializeQueue, enqueueFiles, startQueueProcessing, handleNoFilesNeedLLM } from './queue-manager.js';

const logger = createLogger('OmnySys:llm:analysis');

const BATCH_SIZE = 5; // Mantener en 5 para evitar problemas de memoria

/**
 * Analiza archivos complejos con LLM basado en metadatos de Layer A
 * 
 * Esta función revisa los metadatos que Layer A generó y decide qué archivos
 * necesitan análisis LLM para fortalecer las conexiones semánticas.
 * 
 * @param {Object} context - Contexto del orchestrator
 * @returns {Promise<void>}
 */
export async function analyzeComplexFilesWithLLM(context) {
  logger.info('\n🤖 Orchestrator: Analyzing complex files with LLM...');

  try {
    // Importar dependencias dinámicamente
    const { LLMAnalyzer } = await import('../../../layer-b-semantic/llm-analyzer/index.js');
    const { getFileAnalysis } = await import('../../../layer-c-memory/query/apis/file-api.js');
    const { detectArchetypes } = await import('../../../layer-b-semantic/prompt-engine/prompt-registry/index.js');
    const { buildPromptMetadata } = await import('../../../layer-b-semantic/metadata-contract/index.js');
    const atomDecider = await import('../../../layer-b-semantic/atom-decider/index.js');

    // Verificar disponibilidad de LLM
    const llmService = await LLMService.getInstance();
    const llmReady = await llmService.waitForAvailable(20000);

    if (!llmReady) {
      logger.info('   ⚠️  LLM not available, skipping LLM analysis');
      return;
    }

    logger.info('   ✅ LLM server is available (via LLMService)');

    // Inicializar LLM Analyzer
    const aiConfig = await (await import('../../../ai/llm-client.js')).loadAIConfig();
    const llmAnalyzer = new LLMAnalyzer(aiConfig, context.projectPath);
    llmAnalyzer.client = llmService.client;
    llmAnalyzer.initialized = true;
    logger.info('   ✅ LLM analyzer initialized with shared client');

    // Leer índice de archivos
    const indexPath = path.join(context.OmnySysDataPath, 'index.json');
    const index = await safeReadJson(indexPath, { fileIndex: {} });

    if (!index || !index.fileIndex) {
      logger.info('   ⚠️  No valid index found, skipping LLM analysis');
      return;
    }

    // Preparar dependencias
    const deps = {
      getFileAnalysis,
      buildPromptMetadata,
      detectArchetypes,
      atomDecider
    };

    // Procesar archivos en batches
    const entries = Object.entries(index.fileIndex || {});
    const totalFiles = entries.length;
    let allFilesNeedingLLM = [];
    let totalSkippedUnchanged = 0;
    let totalSkippedHasLLM = 0;

    logger.info(`   📁 Scanning ${totalFiles} files in index...`);

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      const result = await processFileBatch(
        batch,
        context,
        deps,
        llmAnalyzer,
        aiConfig
      );

      allFilesNeedingLLM.push(...result.filesNeedingLLM);
      totalSkippedUnchanged += result.skippedUnchanged;
      totalSkippedHasLLM += result.skippedHasLLM;

      // Yield al event loop cada batch
      await new Promise(resolve => setImmediate(resolve));
    }

    // Log de estadísticas
    logger.info(`   📊 Scan complete: ${totalFiles} total | ${totalSkippedUnchanged} unchanged (skipped) | ${totalSkippedHasLLM} already have LLM`);

    if (allFilesNeedingLLM.length === 0) {
      handleNoFilesNeedLLM(context, totalFiles);
      return;
    }

    // Inicializar y poblar cola
    initializeQueue(context);
    enqueueFiles(context, allFilesNeedingLLM);

    // Limpiar memoria
    const fileCount = allFilesNeedingLLM.length;
    allFilesNeedingLLM.length = 0;

    logger.info('   🚀 Starting processing...');

    // Iniciar procesamiento
    startQueueProcessing(context, context.maxConcurrentAnalyses);

  } catch (error) {
    logger.error('   ❌ Error in LLM analysis phase:', error.message);
  }
}

// Re-exportar funciones públicas para backward compatibility
export { calculateContentHash } from './hash-utils.js';
export { shouldUseLLM } from './llm-decision.js';
export { calculateLLMPriority as _calculateLLMPriority } from './file-processor.js';
