/**
 * @fileoverview analysis-checker.js
 *
 * Verifica y ejecuta Layer A si es necesario.
 * Flujo: Verifica .omnysysdata/ -> Ejecuta Layer A si falta -> Espera completado
 * 
 * 🆕 Versión 2.0: Soporta estrategias inteligentes de indexación
 * - FULL_REINDEX: Análisis completo (casos 1, 5, 8)
 * - INCREMENTAL: Solo archivos cambiados (caso 3)
 * - LOAD_ONLY: Solo cargar datos (caso 2)
 * - SMART: Decisión automática (casos 4, 9)
 *
 * @module mcp/core/analysis-checker
 */

import { createLogger } from '../../../utils/logger.js';
import { hasExistingAnalysis } from './analysis-checker/file-scanner.js';
import { detectCacheChanges } from './analysis-checker/change-detector.js';
import { countPendingLLMAnalysis } from './analysis-checker/llm-analyzer.js';
import { runFullIndexing } from './analysis-checker/index-runner.js';
import { decideIndexingStrategy } from './analysis-checker/decision-engine.js';
import { executeStrategy } from './analysis-checker/strategy-executor.js';
import { IndexingStrategy } from './analysis-checker/strategies/indexing-strategy.js';

const logger = createLogger('OmnySys:analysis:checker');

/**
 * Verifica y ejecuta analisis si es necesario
 * Flujo principal llamado durante inicializacion
 * @param {string} projectPath - Project root path
 * @returns {Promise<Object>} - Result object
 */
export async function checkAndRunAnalysis(projectPath) {
  try {
    const { getProjectMetadata } =
      await import('#layer-c/query/apis/project-api.js');

    const hasAnalysis = await hasExistingAnalysis(projectPath);

    if (!hasAnalysis) {
      logger.info('⚠️  No analysis found, running Layer A...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.info('\n✅ Layer A completed');
      logger.info('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: 0 };
    }

    const metadata = await getProjectMetadata(projectPath);
    const fileCount = metadata?.metadata?.totalFiles || 0;

    logger.info(`✅ Found existing analysis: ${fileCount} files`);

    const hasValidBaseAnalysis =
      fileCount > 0 &&
      (metadata?.fileIndex || metadata?.files) &&
      metadata?.metadata?.enhanced === true;

    if (!hasValidBaseAnalysis) {
      logger.info('   🚨 Analysis incomplete, running Layer A...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.info('\n✅ Layer A completed');
      logger.info('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: fileCount };
    }

    logger.info('   ✅ Layer A analysis valid');

    logger.info('   🔍 Checking for file changes...');
    const changes = await detectCacheChanges(projectPath, metadata);
    
    const hasChanges = changes.newFiles.length > 0 || 
                       changes.modifiedFiles.length > 0 || 
                       changes.deletedFiles.length > 0;
    
    if (hasChanges) {
      logger.info(`   🔄 Changes detected:`);
      if (changes.newFiles.length > 0) {
        logger.info(`      + ${changes.newFiles.length} new files`);
      }
      if (changes.modifiedFiles.length > 0) {
        logger.info(`      ~ ${changes.modifiedFiles.length} modified files`);
      }
      if (changes.deletedFiles.length > 0) {
        logger.info(`      - ${changes.deletedFiles.length} deleted files`);
      }
      logger.info('   🚀 Re-running Layer A analysis...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');
      
      await runFullIndexing(projectPath);
      
      logger.info('\n✅ Layer A completed (updated)');
      logger.info('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: changes.unchangedFiles.length + changes.newFiles.length + changes.modifiedFiles.length };
    }

    const pendingLLM = await countPendingLLMAnalysis(projectPath);
    if (pendingLLM > 0) {
      logger.info(`   ⏳ ${pendingLLM} files pending LLM enrichment (background)`);
    } else {
      logger.info('   ✅ All files processed (no changes detected)');
    }

    return { ran: false, filesAnalyzed: fileCount };
  } catch (error) {
    logger.info('   ❌ Analysis check failed:', error.message);
    throw error;
  }
}

/**
 * 🆕 Verifica y ejecuta análisis con estrategia inteligente
 * 
 * Esta función decide automáticamente la mejor estrategia basada en volumen de cambios:
 * - LOAD_ONLY: Sin cambios (2-3s)
 * - INCREMENTAL: Pocos cambios <10 archivos (< 5s)
 * - FULL_REINDEX: Muchos cambios >20% o >100 archivos (30-60s)
 * 
 * @param {string} projectPath - Project root path
 * @param {Object} options - Opciones
 * @param {Object} options.orchestrator - Instancia del orchestrator (para incremental)
 * @param {Function} options.reloadMetadataFn - Callback para recargar metadata
 * @returns {Promise<Object>} - Result object con estrategia usada
 */
export async function checkAndRunAnalysisSmart(projectPath, options = {}) {
  const { orchestrator = null, reloadMetadataFn = null } = options;
  
  try {
    const { getProjectMetadata } =
      await import('#layer-c/query/apis/project-api.js');

    // Paso 1: Verificar si existe análisis previo
    const hasAnalysis = await hasExistingAnalysis(projectPath);

    if (!hasAnalysis) {
      logger.info('⚠️  No analysis found, running Layer A...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');

      const result = await runFullIndexing(projectPath);

      if (reloadMetadataFn) {
        await reloadMetadataFn();
      }

      logger.info('\n✅ Layer A completed');
      logger.info('   🤖 LLM enrichment will continue in background');
      
      return {
        ran: true,
        strategy: IndexingStrategy.FULL_REINDEX,
        filesAnalyzed: Object.keys(result.files || {}).length,
        duration: result.duration || 0
      };
    }

    // Paso 2: Cargar metadata existente
    const metadata = await getProjectMetadata(projectPath);
    const fileCount = metadata?.metadata?.totalFiles || 0;

    logger.info(`✅ Found existing analysis: ${fileCount} files`);

    // Validar integridad del análisis
    const hasValidBaseAnalysis =
      fileCount > 0 &&
      (metadata?.fileIndex || metadata?.files);

    if (!hasValidBaseAnalysis) {
      logger.info('   🚨 Analysis incomplete or corrupted, running Layer A...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');

      const result = await runFullIndexing(projectPath);

      if (reloadMetadataFn) {
        await reloadMetadataFn();
      }

      logger.info('\n✅ Layer A completed');
      logger.info('   🤖 LLM enrichment will continue in background');
      
      return {
        ran: true,
        strategy: IndexingStrategy.FULL_REINDEX,
        filesAnalyzed: Object.keys(result.files || {}).length,
        duration: result.duration || 0
      };
    }

    // Paso 3: Detectar cambios
    logger.info('   🔍 Checking for file changes...');
    const changes = await detectCacheChanges(projectPath, metadata);
    
    const hasChanges = changes.newFiles.length > 0 || 
                       changes.modifiedFiles.length > 0 || 
                       changes.deletedFiles.length > 0;
    
    if (!hasChanges) {
      // Sin cambios: solo cargar datos
      logger.info('   ✅ No changes detected');
      
      if (reloadMetadataFn) {
        await reloadMetadataFn();
      }

      const pendingLLM = await countPendingLLMAnalysis(projectPath);
      if (pendingLLM > 0) {
        logger.info(`   ⏳ ${pendingLLM} files pending LLM enrichment (background)`);
      } else {
        logger.info('   ✅ All files processed');
      }

      return {
        ran: false,
        strategy: IndexingStrategy.LOAD_ONLY,
        filesAnalyzed: fileCount,
        filesChanged: 0
      };
    }

    // Paso 4: Decidir estrategia basada en volumen
    const decision = await decideIndexingStrategy(projectPath, metadata, changes);
    
    // Loguear decisión
    logger.info(`\n📊 Change detection:`);
    logger.info(`   New: ${changes.newFiles.length}, Modified: ${changes.modifiedFiles.length}, Deleted: ${changes.deletedFiles.length}`);
    logger.info(`   Decision: ${decision.strategy} (${decision.estimatedTime})`);
    logger.info(`   Reason: ${decision.reason}\n`);

    // Paso 5: Ejecutar estrategia seleccionada
    const result = await executeStrategy(decision, changes, {
      projectPath,
      orchestrator,
      reloadMetadataFn
    });

    // Loguear resultado
    const duration = result.duration ? ` (${result.duration.toFixed(2)}s)` : '';
    logger.info(`\n✅ Strategy completed: ${result.strategy}${duration}`);
    logger.info(`   Files analyzed: ${result.filesAnalyzed}`);

    return {
      ran: true,
      strategy: result.strategy,
      filesAnalyzed: result.filesAnalyzed,
      filesChanged: changes.newFiles.length + changes.modifiedFiles.length + changes.deletedFiles.length,
      duration: result.duration,
      incremental: result.incremental
    };

  } catch (error) {
    logger.error('   ❌ Smart analysis check failed:', error.message);
    
    // Fallback: usar estrategia tradicional
    logger.info('   🔄 Falling back to traditional full indexing...');
    return await checkAndRunAnalysis(projectPath);
  }
}
