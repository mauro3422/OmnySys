/**
 * @fileoverview indexing-strategy.js
 * 
 * Estrategias de indexación disponibles para el sistema.
 * Define los diferentes modos de análisis que pueden ejecutarse.
 * 
 * @module mcp/core/analysis-checker/strategies/indexing-strategy
 */

/**
 * Estrategias de indexación soportadas
 * @readonly
 * @enum {string}
 */
export const IndexingStrategy = {
  /** Análisis completo de TODO el proyecto (desde cero) */
  FULL_REINDEX: 'FULL_REINDEX',
  
  /** Solo cargar datos existentes sin analizar */
  LOAD_ONLY: 'LOAD_ONLY',
  
  /** Análisis incremental de solo archivos modificados */
  INCREMENTAL: 'INCREMENTAL',
  
  /** Decisión inteligente basada en volumen de cambios */
  SMART: 'SMART'
};

/**
 * Configuración por defecto para cada estrategia
 * @type {Object}
 */
export const StrategyDefaults = {
  [IndexingStrategy.FULL_REINDEX]: {
    description: 'Análisis completo del proyecto',
    estimatedTime: '30-60s',
    useCase: 'Primer inicio, corrupción de datos, cambios masivos >20%'
  },
  
  [IndexingStrategy.LOAD_ONLY]: {
    description: 'Carga rápida de datos existentes',
    estimatedTime: '2-3s',
    useCase: 'Reinicio sin cambios, servidor ya inicializado'
  },
  
  [IndexingStrategy.INCREMENTAL]: {
    description: 'Análisis de solo archivos cambiados',
    estimatedTime: '< 5s',
    useCase: 'Pocos cambios < 10 archivos o < 5% del proyecto'
  },
  
  [IndexingStrategy.SMART]: {
    description: 'Decisión automática basada en volumen',
    estimatedTime: 'Variable',
    useCase: 'Default - elige la mejor estrategia automáticamente'
  }
};

/**
 * Umbrales para decisión SMART
 * @type {Object}
 */
export const SmartThresholds = {
  /** Máximo número de archivos para análisis incremental */
  MAX_INCREMENTAL_FILES: 10,
  
  /** Máximo porcentaje del proyecto para incremental */
  MAX_INCREMENTAL_PERCENT: 5,
  
  /** Mínimo número de archivos para reindexar todo */
  MIN_FULL_REINDEX_FILES: 100,
  
  /** Mínimo porcentaje para reindexar todo */
  MIN_FULL_REINDEX_PERCENT: 20
};
