/**
 * @fileoverview strategy-executor.js
 *
 * Ejecutor de estrategias de indexación.
 * Funciones puras sin clase — la clase anterior era un wrapper innecesario.
 *
 * @module mcp/core/analysis-checker/strategy-executor
 */

import { IndexingStrategy } from './strategies/indexing-strategy.js';
import { runFullIndexing } from './index-runner.js';
import { createLogger } from '../../../../utils/logger.js';
import { executeLiveRowCleanup } from '../../../../shared/compiler/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

const logger = createLogger('OmnySys:strategy:executor');

// --- Pure helper functions ---

async function runFinalCleanup(projectPath) {
  try {
    const repo = getRepository(projectPath);
    if (repo && repo.db) {
      logger.info('   🧹 Ejecutando limpieza automática de registros huérfanos...');
      const result = executeLiveRowCleanup(repo.db, { dryRun: false });
      const total = (result.deleted.atoms || 0) +
        (result.deleted.files || 0) +
        (result.deleted.relations || 0) +
        (result.deleted.issues || 0);

      if (total > 0) {
        logger.info(`   ✨ Limpieza completada: ${total} registros purgados`);
      } else {
        logger.info('   ✅ No se encontraron registros huérfanos');
      }
    }
  } catch (error) {
    logger.warn(`   ⚠️  Limpieza automática fallida: ${error.message}`);
  }
}

async function executeLoadOnlyStrategy(metrics, reloadMetadataFn) {
  logger.info('   📦 Cargando datos existentes...');
  const startTime = Date.now();

  if (reloadMetadataFn) {
    await reloadMetadataFn();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`   ✅ Datos cargados en ${duration}s`);
  logger.info(`   📊 ${metrics.totalFiles} archivos listos`);

  return {
    strategy: IndexingStrategy.LOAD_ONLY,
    filesAnalyzed: 0,
    filesLoaded: metrics.totalFiles,
    duration: parseFloat(duration),
    incremental: false
  };
}

async function executeFullReindexStrategy(projectPath, reloadMetadataFn) {
  logger.info('   🚀 Iniciando reindexación completa...');
  const result = await runFullIndexing(projectPath);

  if (reloadMetadataFn) {
    await reloadMetadataFn();
  }

  const fileCount = Object.keys(result.files || {}).length;
  logger.info(`   ✅ Reindexación completada`);
  logger.info(`   📊 ${fileCount} archivos analizados`);

  return {
    strategy: IndexingStrategy.FULL_REINDEX,
    filesAnalyzed: fileCount,
    duration: result.duration || 0,
    incremental: false
  };
}

async function queueFilesInOrchestrator(orchestrator, files) {
  if (!orchestrator || !orchestrator.queue) {
    throw new Error('Orchestrator no disponible para análisis incremental');
  }

  logger.info(`   📥 Encolando ${files.length} archivos...`);

  for (const filePath of files) {
    orchestrator.queue.enqueue(filePath, 'high');
  }

  if (orchestrator._processNext) {
    orchestrator._processNext();
  }

  await waitForQueueCompletion(orchestrator, files.length);
}

async function analyzeFilesDirectly(projectPath, files) {
  const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
  logger.info(`   📝 Analizando ${files.length} archivos directamente...`);

  for (const filePath of files) {
    try {
      await analyzeSingleFile(projectPath, filePath, {
        verbose: false,
        incremental: true
      });
    } catch (error) {
      logger.warn(`   ⚠️  Error analizando ${filePath}: ${error.message}`);
    }
  }
}

async function waitForQueueCompletion(orchestrator, expectedFiles, timeoutMs = 120000) {
  if (!orchestrator) return;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const queueSize = orchestrator.queue?.size() || 0;
    const activeJobs = orchestrator.activeJobs || 0;

    if (queueSize === 0 && activeJobs === 0) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logger.warn('   ⏱️  Timeout esperando cola del orchestrator');
}

async function executeIncrementalStrategy(orchestrator, projectPath, changes, reloadMetadataFn) {
  const filesToAnalyze = [...changes.newFiles, ...changes.modifiedFiles];
  logger.info(`   🔄 Analizando ${filesToAnalyze.length} archivos incrementalmente...`);

  const startTime = Date.now();

  if (orchestrator) {
    await queueFilesInOrchestrator(orchestrator, filesToAnalyze);
  } else {
    await analyzeFilesDirectly(projectPath, filesToAnalyze);
  }

  if (reloadMetadataFn) {
    await reloadMetadataFn();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`   ✅ Análisis incremental completado en ${duration}s`);

  return {
    strategy: IndexingStrategy.INCREMENTAL,
    filesAnalyzed: filesToAnalyze.length,
    filesDeleted: changes.deletedFiles.length,
    duration: parseFloat(duration),
    incremental: true
  };
}

/**
 * Ejecuta la estrategia seleccionada
 * @param {Object} decision - Decisión del motor
 * @param {Object} changes - Cambios detectados
 * @param {Object} context - Contexto (projectPath, orchestrator, reloadMetadataFn)
 * @returns {Promise<Object>} Resultado
 */
export async function executeStrategy(decision, changes, context) {
  const { strategy, metrics } = decision;
  const { projectPath, orchestrator, reloadMetadataFn } = context;

  logger.info(`\n🎯 Ejecutando estrategia: ${strategy}`);

  let result;
  switch (strategy) {
    case IndexingStrategy.LOAD_ONLY:
      result = await executeLoadOnlyStrategy(metrics, reloadMetadataFn);
      break;
    case IndexingStrategy.INCREMENTAL:
      result = await executeIncrementalStrategy(orchestrator, projectPath, changes, reloadMetadataFn);
      break;
    case IndexingStrategy.FULL_REINDEX:
      result = await executeFullReindexStrategy(projectPath, reloadMetadataFn);
      break;
    default:
      throw new Error(`Estrategia desconocida: ${strategy}`);
  }

  await runFinalCleanup(projectPath);
  return result;
}
