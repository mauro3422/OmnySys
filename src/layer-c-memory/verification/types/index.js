/**
 * @fileoverview verification-types.js
 * 
 * Tipos y enums para el sistema de verificación y certificación
 * Define contratos para validadores, reportes y certificados
 * 
 * @module verification/types
 */

/**
 * Nivel de severidad de un issue
 * @enum {string}
 */
export const Severity = {
  CRITICAL: 'critical',  // Datos corruptos, inconsistencias graves
  HIGH: 'high',          // Duplicación, SSOT violado
  MEDIUM: 'medium',      // Inconsistencias menores
  LOW: 'low',            // Optimizaciones sugeridas
  INFO: 'info'           // Información adicional
};

/**
 * Categoría del issue encontrado
 * @enum {string}
 */
export const IssueCategory = {
  INTEGRITY: 'integrity',           // JSONs inválidos, datos corruptos
  CONSISTENCY: 'consistency',       // SSOT violado, datos no coinciden
  COMPLETENESS: 'completeness',     // Faltan datos, incompleto
  COHERENCE: 'coherence',           // Relaciones inconsistentes
  PERFORMANCE: 'performance',       // Problemas de performance
  STRUCTURE: 'structure'            // Problemas estructurales
};

/**
 * Sistema de datos verificado
 * @enum {string}
 */
export const DataSystem = {
  ATOMS: 'atoms',
  FILES: 'files',
  CONNECTIONS: 'connections',
  CACHE: 'cache',
  SHADOWS: 'shadows',
  DECISIONS: 'decisions',
  RISKS: 'risks'
};

/**
 * Estado de verificación
 * @enum {string}
 */
export const VerificationStatus = {
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning',
  SKIPPED: 'skipped'
};

/**
 * @typedef {Object} VerificationIssue
 * @property {string} id - ID único del issue
 * @property {IssueCategory} category - Categoría
 * @property {Severity} severity - Nivel de severidad
 * @property {DataSystem} system - Sistema afectado
 * @property {string} path - Path del recurso afectado
 * @property {string} message - Descripción del problema
 * @property {string} [expected] - Valor esperado
 * @property {string} [actual] - Valor actual
 * @property {Object} [metadata] - Metadata adicional
 * @property {string} [suggestion] - Sugerencia de corrección
 */

/**
 * @typedef {Object} SystemStats
 * @property {DataSystem} system - Nombre del sistema
 * @property {number} totalItems - Total de items
 * @property {number} validItems - Items válidos
 * @property {number} invalidItems - Items inválidos
 * @property {number} issues - Cantidad de issues
 */

/**
 * @typedef {Object} VerificationReport
 * @property {string} projectPath - Path del proyecto
 * @property {Date} timestamp - Fecha de verificación
 * @property {VerificationStatus} status - Estado general
 * @property {SystemStats[]} stats - Estadísticas por sistema
 * @property {VerificationIssue[]} issues - Issues encontrados
 * @property {Object} summary - Resumen ejecutivo
 * @property {string} version - Versión del verificador
 */

/**
 * @typedef {Object} Certificate
 * @property {string} id - ID único del certificado
 * @property {string} projectPath - Path del proyecto
 * @property {Date} issuedAt - Fecha de emisión
 * @property {Date} validUntil - Válido hasta
 * @property {VerificationStatus} status - Estado
 * @property {string} hash - Hash de verificación
 * @property {Object} metrics - Métricas del sistema
 * @property {string[]} signatures - Firmas de validación
 */

/**
 * @typedef {Object} ValidatorConfig
 * @property {boolean} [checkIntegrity=true] - Verificar integridad JSON
 * @property {boolean} [checkConsistency=true] - Verificar SSOT
 * @property {boolean} [checkCompleteness=true] - Verificar completitud
 * @property {boolean} [checkCoherence=true] - Verificar coherencia
 * @property {Severity} [minSeverity='info'] - Severidad mínima a reportar
 * @property {DataSystem[]} [systems] - Sistemas a verificar
 */

export default {
  Severity,
  IssueCategory,
  DataSystem,
  VerificationStatus
};
