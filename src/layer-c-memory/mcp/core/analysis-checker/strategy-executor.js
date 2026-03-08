/**
 * @fileoverview strategy-executor.js
 * 
 * Ejecutor de estrategias de indexación.
 * Implementa la lógica de ejecución para cada estrategia,
 * integrándose con el orchestrator existente.
 * 
 * @module mcp/core/analysis-checker/strategy-executor
 */

import { IndexingStrategy } from './strategies/indexing-strategy.js';
import { runFullIndexing } from './index-runner.js';
import { createLogger } from '../../../../utils/logger.js';
import { executeLiveRowCleanup } from '../../../../shared/compiler/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';


const logger = createLogger('OmnySys:strategy:executor');

/**
 * Ejecutor de estrategias de indexación
 */
export class StrategyExecutor {
  constructor(projectPath, orchestrator = null) {
    this.projectPath = projectPath;
    this.orchestrator = orchestrator;
  }

  /**
   * Ejecuta la estrategia seleccionada
   * 
   * @param {Object} decision - Decisión del motor (strategy, metrics, etc.)
   * @param {Object} changes - Cambios detectados
   * @param {Function} reloadMetadataFn - Callback para recargar metadata
   * @returns {Promise<Object>} Resultado de la ejecución
   */
  async execute(decision, changes, reloadMetadataFn) {
    const { strategy, metrics } = decision;

    logger.info(`\n🎯 Ejecutando estrategia: ${strategy}`);

    switch (strategy) {
      case IndexingStrategy.LOAD_ONLY:
        return await this._executeLoadOnly(metrics, reloadMetadataFn);

      case IndexingStrategy.INCREMENTAL:
        return await this._executeIncremental(changes, metrics, reloadMetadataFn);

      case IndexingStrategy.FULL_REINDEX:
        return await this._executeFullReindex(reloadMetadataFn);

      default:
        throw new Error(`Estrategia desconocida: ${strategy}`);
    }
  }

  /**
   * Finaliza la ejecución con una limpieza de filas huérfanas
   * @private
   */
  async _runFinalCleanup() {
    try {
      const repo = getRepository(this.projectPath);
      if (repo && repo.db) {
        logger.info('   🧹 Ejecutando limpieza automática de registros huérfanos...');
        const result = executeLiveRowCleanup(repo.db, { dryRun: false });
        const total = (result.deleted.files || 0) +
          (result.deleted.relations || 0) +
          (result.deleted.issues || 0);

        if (total > 0) {
          logger.info(`   ✨ Limpieza completada: ${total} registros purgados (${result.deleted.relations} relaciones, ${result.deleted.issues} issues)`);
        } else {
          logger.info('   ✅ No se encontraron registros huérfanos');
        }
      }
    } catch (error) {
      logger.warn(`   ⚠️  Limpieza automática fallida: ${error.message}`);
    }
  }

  async execute(decision, changes, reloadMetadataFn) {
    const result = await this._executeWithStrategy(decision, changes, reloadMetadataFn);

    // Auto-cleanup al finalizar CUALQUIER estrategia
    await this._runFinalCleanup();

    return result;
  }

  async _executeWithStrategy(decision, changes, reloadMetadataFn) {
    const { strategy, metrics } = decision;

    logger.info(`\n🎯 Ejecutando estrategia: ${strategy}`);

    switch (strategy) {
      case IndexingStrategy.LOAD_ONLY:
        return await this._executeLoadOnly(metrics, reloadMetadataFn);

      case IndexingStrategy.INCREMENTAL:
        return await this._executeIncremental(changes, metrics, reloadMetadataFn);

      case IndexingStrategy.FULL_REINDEX:
        return await this._executeFullReindex(reloadMetadataFn);

      default:
        throw new Error(`Estrategia desconocida: ${strategy}`);
    }
  }


  /**
   * Estrategia LOAD_ONLY: Solo cargar datos existentes
   * @private
   */
  async _executeLoadOnly(metrics, reloadMetadataFn) {
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

  /**
   * Estrategia INCREMENTAL: Analizar solo archivos cambiados
   * @private
   */
  async _executeIncremental(changes, metrics, reloadMetadataFn) {
    const filesToAnalyze = [
      ...changes.newFiles,
      ...changes.modifiedFiles
    ];

    logger.info(`   🔄 Analizando ${filesToAnalyze.length} archivos incrementalmente...`);

    const startTime = Date.now();

    // Usar el orchestrator si está disponible
    if (this.orchestrator) {
      await this._queueFilesInOrchestrator(filesToAnalyze);
    } else {
      // Fallback: analizar archivos directamente
      await this._analyzeFilesDirectly(filesToAnalyze);
    }

    // Marcar archivos eliminados
    if (changes.deletedFiles.length > 0) {
      await this._markDeletedFiles(changes.deletedFiles);
    }

    // Recargar metadata
    if (reloadMetadataFn) {
      await reloadMetadataFn();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info(`   ✅ Análisis incremental completado en ${duration}s`);
    logger.info(`   📊 ${filesToAnalyze.length} archivos analizados`);

    return {
      strategy: IndexingStrategy.INCREMENTAL,
      filesAnalyzed: filesToAnalyze.length,
      filesDeleted: changes.deletedFiles.length,
      duration: parseFloat(duration),
      incremental: true
    };
  }

  /**
   * Estrategia FULL_REINDEX: Análisis completo del proyecto
   * @private
   */
  async _executeFullReindex(reloadMetadataFn) {
    logger.info('   🚀 Iniciando reindexación completa...');

    const result = await runFullIndexing(this.projectPath);

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

  /**
   * Encola archivos en el orchestrator para análisis
   * @private
   */
  async _queueFilesInOrchestrator(files) {
    if (!this.orchestrator || !this.orchestrator.queue) {
      throw new Error('Orchestrator no disponible para análisis incremental');
    }

    logger.info(`   📥 Encolando ${files.length} archivos...`);

    for (const filePath of files) {
      // Usar prioridad 'high' para cambios detectados al inicio
      this.orchestrator.queue.enqueue(filePath, 'high');
    }

    // Iniciar procesamiento
    if (this.orchestrator._processNext) {
      this.orchestrator._processNext();
    }

    // Esperar a que se completen (con timeout)
    await this._waitForQueueCompletion(files.length);
  }

  /**
   * Analiza archivos directamente (fallback sin orchestrator)
   * @private
   */
  async _analyzeFilesDirectly(files) {
    const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');

    logger.info(`   📝 Analizando ${files.length} archivos directamente...`);

    for (const filePath of files) {
      try {
        await analyzeSingleFile(this.projectPath, filePath, {
          verbose: false,
          incremental: true
        });
      } catch (error) {
        logger.warn(`   ⚠️  Error analizando ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Marca archivos eliminados en el sistema
   * @private
   */
  async _markDeletedFiles(deletedFiles) {
    logger.info(`   🗑️  Marcando ${deletedFiles.length} archivos eliminados...`);

    // Los archivos eliminados se manejan automáticamente
    // cuando el file watcher detecta la eliminación
    // Aquí podríamos limpiar el caché si es necesario
  }

  /**
   * Espera a que se complete el procesamiento de la cola
   * @private
   */
  async _waitForQueueCompletion(expectedFiles, timeoutMs = 120000) {
    if (!this.orchestrator) return;

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const queueSize = this.orchestrator.queue?.size() || 0;
      const activeJobs = this.orchestrator.activeJobs || 0;

      if (queueSize === 0 && activeJobs === 0) {
        return; // Completado
      }

      // Esperar 100ms antes de verificar de nuevo
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.warn('   ⏱️  Timeout esperando cola del orchestrator');
  }
}

/**
 * Función helper para ejecutar estrategia
 * @param {Object} decision - Decisión del motor
 * @param {Object} changes - Cambios detectados
 * @param {Object} context - Contexto (projectPath, orchestrator, reloadMetadataFn)
 * @returns {Promise<Object>} Resultado
 */
export async function executeStrategy(decision, changes, context) {
  const { projectPath, orchestrator, reloadMetadataFn } = context;
  const executor = new StrategyExecutor(projectPath, orchestrator);
  return await executor.execute(decision, changes, reloadMetadataFn);
}
