/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes para análisis de estructura de proyecto
 * 
 * @module project-analyzer/constants
 */

import path from 'path';

/**
 * Pesos para cálculo de cohesión
 * @constant {Object}
 */
export const COHESION_WEIGHTS = {
  DIRECT_IMPORTS: 3,        // Imports directos (conexión muy fuerte)
  SHARED_STATE: 2,          // Shared state reads/writes
  SHARED_EVENTS: 2,         // Event emitters/listeners
  SAME_DIRECTORY: 1,        // Mismo directorio
  NEARBY_DIRECTORY: 0.5     // Directorio cercano (2+ niveles compartidos)
};

/**
 * Umbrales de cohesión
 * @constant {Object}
 */
export const COHESION_THRESHOLDS = {
  MIN_FOR_CLUSTER: 1,       // Mínimo para formar cluster
  HIGH_COHESION: 5,         // Cohesión considerada alta
  MAX_SCORE: 10             // Score máximo posible
};

/**
 * Niveles de severidad para archivos huérfanos
 * @readonly
 * @enum {string}
 */
export const Severity = {
  HIGH: 'high',
  LOW: 'low'
};

/**
 * Configuración de directorios
 * @constant {Object}
 */
export const DIRECTORY_CONFIG = {
  SEPARATOR: path.sep,
  MIN_SHARED_LEVELS: 2      // Niveles mínimos para considerar "cercano"
};

/**
 * Textos para reportes
 * @constant {Object}
 */
export const REPORT_TEXTS = {
  TITLE: 'PROJECT STRUCTURE ANALYSIS',
  SUBSYSTEMS_TITLE: '📦 DETECTED SUBSYSTEMS',
  ORPHANS_TITLE: '⚠️  ORPHAN FILES',
  HIGH_SEVERITY: '[HIGH]',
  LOW_SEVERITY: '[LOW]'
};

/**
 * Configuración de formateo
 * @constant {Object}
 */
export const FORMAT_CONFIG = {
  COHESION_DECIMALS: 2,
  PERCENTAGE_DECIMALS: 1,
  MAX_FILES_TO_LIST: 10     // Máximo de archivos a listar en un cluster
};
