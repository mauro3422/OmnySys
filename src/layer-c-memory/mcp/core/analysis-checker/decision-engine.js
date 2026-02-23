/**
 * @fileoverview decision-engine.js
 * 
 * Motor de decisiones para estrategias de indexación.
 * Analiza métricas del proyecto y decide la mejor estrategia a ejecutar.
 * 
 * @module mcp/core/analysis-checker/decision-engine
 */

import { 
  IndexingStrategy, 
  SmartThresholds 
} from './strategies/indexing-strategy.js';
import { detectCacheChanges } from './change-detector.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:decision:engine');

/**
 * Resultado del análisis de cambios
 * @typedef {Object} ChangeMetrics
 * @property {number} newFiles - Cantidad de archivos nuevos
 * @property {number} modifiedFiles - Cantidad de archivos modificados
 * @property {number} deletedFiles - Cantidad de archivos eliminados
 * @property {number} unchangedFiles - Cantidad de archivos sin cambios
 * @property {number} totalFiles - Total de archivos en el proyecto
 * @property {number} changedFiles - Total de archivos con cambios
 * @property {number} changePercentage - Porcentaje de archivos cambiados
 */

/**
 * Motor de decisiones para estrategias de indexación
 */
export class IndexingDecisionEngine {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Decide la estrategia óptima basada en métricas de cambios
   * 
   * @param {Object} metadata - Metadata del proyecto
   * @param {Object} changes - Cambios detectados
   * @returns {Promise<Object>} Decisión con estrategia y justificación
   */
  async decideStrategy(metadata, changes) {
    const metrics = this._calculateMetrics(metadata, changes);
    
    // Si no hay cambios, solo cargar datos
    if (metrics.changedFiles === 0) {
      return {
        strategy: IndexingStrategy.LOAD_ONLY,
        metrics,
        reason: 'No hay cambios detectados',
        estimatedTime: '2-3s'
      };
    }

    // Calcular estrategia basada en volumen
    const strategy = this._selectStrategy(metrics);
    
    return {
      strategy,
      metrics,
      reason: this._explainDecision(strategy, metrics),
      estimatedTime: this._estimateTime(strategy, metrics)
    };
  }

  /**
   * Calcula métricas de cambios
   * @private
   */
  _calculateMetrics(metadata, changes) {
    const totalFiles = metadata?.stats?.totalFiles || 
                      Object.keys(metadata?.fileIndex || {}).length || 
                      0;
    
    const changedFiles = 
      changes.newFiles.length + 
      changes.modifiedFiles.length + 
      changes.deletedFiles.length;
    
    const changePercentage = totalFiles > 0 
      ? (changedFiles / totalFiles) * 100 
      : 0;

    return {
      newFiles: changes.newFiles.length,
      modifiedFiles: changes.modifiedFiles.length,
      deletedFiles: changes.deletedFiles.length,
      unchangedFiles: changes.unchangedFiles.length,
      totalFiles,
      changedFiles,
      changePercentage: Math.round(changePercentage * 100) / 100
    };
  }

  /**
   * Selecciona la estrategia basada en métricas
   * @private
   */
  _selectStrategy(metrics) {
    const { 
      MAX_INCREMENTAL_FILES, 
      MAX_INCREMENTAL_PERCENT,
      MIN_FULL_REINDEX_FILES,
      MIN_FULL_REINDEX_PERCENT 
    } = SmartThresholds;

    const totalChanged = metrics.changedFiles;
    const percentage = metrics.changePercentage;

    // Estrategia INCREMENTAL: pocos archivos cambiados
    if (totalChanged <= MAX_INCREMENTAL_FILES && percentage <= MAX_INCREMENTAL_PERCENT) {
      return IndexingStrategy.INCREMENTAL;
    }

    // Estrategia FULL_REINDEX: muchos archivos cambiados
    if (totalChanged >= MIN_FULL_REINDEX_FILES || percentage >= MIN_FULL_REINDEX_PERCENT) {
      return IndexingStrategy.FULL_REINDEX;
    }

    // Caso intermedio: usar incremental (es más rápido incluso para 20-50 archivos)
    // que reindexar todo el proyecto (2000+ archivos)
    if (totalChanged <= 50) {
      return IndexingStrategy.INCREMENTAL;
    }

    // Default: reindexar todo
    return IndexingStrategy.FULL_REINDEX;
  }

  /**
   * Explica la decisión tomada
   * @private
   */
  _explainDecision(strategy, metrics) {
    switch (strategy) {
      case IndexingStrategy.LOAD_ONLY:
        return 'No se detectaron cambios en archivos';
      
      case IndexingStrategy.INCREMENTAL:
        return `${metrics.changedFiles} archivos cambiados (${metrics.changePercentage}%) - ` +
               `Análisis incremental más eficiente`;
      
      case IndexingStrategy.FULL_REINDEX:
        return `${metrics.changedFiles} archivos cambiados (${metrics.changePercentage}%) - ` +
               `Volumen alto, reindexación completa más eficiente`;
      
      default:
        return 'Estrategia por defecto';
    }
  }

  /**
   * Estima el tiempo de ejecución
   * @private
   */
  _estimateTime(strategy, metrics) {
    switch (strategy) {
      case IndexingStrategy.LOAD_ONLY:
        return '2-3s';
      
      case IndexingStrategy.INCREMENTAL:
        // Aproximadamente 0.5s por archivo
        const estimatedSecs = Math.max(1, Math.round(metrics.changedFiles * 0.5));
        return `${estimatedSecs}s`;
      
      case IndexingStrategy.FULL_REINDEX:
        return '30-60s';
      
      default:
        return 'Desconocido';
    }
  }

  /**
   * Loguea la decisión para debugging
   * @param {Object} decision - Decisión tomada
   */
  logDecision(decision) {
    const { strategy, metrics, reason, estimatedTime } = decision;
    
    logger.info('📊 Decisión de indexación:');
    logger.info(`   Estrategia: ${strategy}`);
    logger.info(`   Archivos cambiados: ${metrics.changedFiles}/${metrics.totalFiles} (${metrics.changePercentage}%)`);
    logger.info(`   Nuevos: ${metrics.newFiles}, Modificados: ${metrics.modifiedFiles}, Eliminados: ${metrics.deletedFiles}`);
    logger.info(`   Razón: ${reason}`);
    logger.info(`   Tiempo estimado: ${estimatedTime}`);
  }
}

/**
 * Función helper para crear instancia y decidir
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} metadata - Metadata existente
 * @param {Object} changes - Cambios detectados
 * @returns {Promise<Object>} Decisión
 */
export async function decideIndexingStrategy(projectPath, metadata, changes) {
  const engine = new IndexingDecisionEngine(projectPath);
  return await engine.decideStrategy(metadata, changes);
}
