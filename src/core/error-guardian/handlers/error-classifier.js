/**
 * @fileoverview error-classifier.js
 * 
 * Error Classification System
 * 
 * Analyzes errors and determines their type, severity, and
 * potential solutions based on pattern matching.
 * 
 * @module core/error-guardian/handlers/error-classifier
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:classifier');

/**
 * Error severity levels
 */
export const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Known error patterns and their configurations
 */
export const ERROR_PATTERNS = {
  // Errores de sintaxis
  'SyntaxError': {
    pattern: /SyntaxError: (.*)/,
    severity: SEVERITY.CRITICAL,
    autoFixable: false,
    suggestion: (match) => `Error de sintaxis: ${match[1]}. Usar 'npm run validate' antes de commitear.`,
    prevent: 'atomic_edit valida sintaxis antes de guardar',
    category: 'SYNTAX'
  },

  // Errores de módulos no encontrados
  'MODULE_NOT_FOUND': {
    pattern: /Cannot find module ['"](.+?)['"]/,
    severity: SEVERITY.HIGH,
    autoFixable: true,
    suggestion: (match) => `Módulo no encontrado: ${match[1]}. Verificar: 1) Ruta correcta, 2) Archivo existe, 3) Exportación correcta`,
    commonFixes: [
      'Verificar que el archivo existe en la ruta indicada',
      'Cambiar import relativo por alias (#core/, #utils/)',
      'Revisar que el archivo tenga export default/named',
      'Verificar extensión .js en imports'
    ],
    category: 'MODULE'
  },

  // Errores de importación dinámica
  'DYNAMIC_IMPORT': {
    pattern: /await import\(/,
    severity: SEVERITY.MEDIUM,
    autoFixable: true,
    suggestion: () => 'Import dinámico fuera de async function. Mover import al tope del archivo.',
    commonFixes: [
      'Mover import al nivel superior del archivo',
      'Usar import estático en lugar de dinámico',
      'Agregar async/await si es necesario'
    ],
    category: 'IMPORT'
  },

  // Errores de caché corrupto
  'CACHE_ERROR': {
    pattern: /Failed to read.*\.json.*ENOENT/,
    severity: SEVERITY.MEDIUM,
    autoFixable: true,
    suggestion: () => 'Archivo de caché no encontrado. Re-generar con restart_server({clearCache: true})',
    commonFixes: [
      'Ejecutar restart_server({clearCache: true})',
      'Eliminar manualmente .omnysysdata/files/',
      'Re-analizar proyecto completo'
    ],
    category: 'CACHE'
  },

  // Errores de timeout
  'TIMEOUT': {
    pattern: /timeout|ETIMEOUT/i,
    severity: SEVERITY.MEDIUM,
    autoFixable: false,
    suggestion: () => 'Timeout en operación. Posibles causas: loop infinito, operación muy pesada, recurso bloqueado.',
    commonFixes: [
      'Revisar loops infinitos en código',
      'Agregar límites a operaciones pesadas',
      'Usar streaming para archivos grandes'
    ],
    category: 'PERFORMANCE'
  },

  // Errores de memoria
  'MEMORY': {
    pattern: /out of memory|heap|ENOSPC/i,
    severity: SEVERITY.CRITICAL,
    autoFixable: false,
    suggestion: () => 'Error de memoria. El proceso consume demasiada RAM.',
    commonFixes: [
      'Procesar archivos en batches más pequeños',
      'Liberar referencias no usadas',
      'Aumentar límite de memoria de Node.js',
      'Usar streaming en lugar de cargar todo en memoria'
    ],
    category: 'RESOURCE'
  },

  // Errores de EPIPE (pipe rota - cliente MCP se desconectó)
  'EPIPE': {
    pattern: /EPIPE|broken pipe/i,
    severity: SEVERITY.LOW,
    autoFixable: false,
    suggestion: () => 'EPIPE: Cliente MCP desconectado. Normal durante transiciones de IDE.',
    commonFixes: [
      'Ignorar - es comportamiento normal cuando un IDE se cierra',
      'El sistema se recupera automáticamente'
    ],
    category: 'NETWORK'
  },

  // Errores de red
  'NETWORK_ERROR': {
    pattern: /ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT/,
    severity: SEVERITY.HIGH,
    autoFixable: true,
    suggestion: () => 'Error de conexión de red. Verificar conectividad.',
    commonFixes: [
      'Verificar conexión a internet',
      'Revisar configuración de proxy',
      'Verificar que el servicio destino esté disponible',
      'Reintentar la operación'
    ],
    category: 'NETWORK'
  },

  // Errores de permisos
  'PERMISSION_ERROR': {
    pattern: /EACCES|EPERM|permission denied/i,
    severity: SEVERITY.HIGH,
    autoFixable: false,
    suggestion: () => 'Error de permisos. No se tiene acceso al recurso.',
    commonFixes: [
      'Verificar permisos de archivo/directorio',
      'Ejecutar con privilegios adecuados',
      'Cambiar propietario del archivo'
    ],
    category: 'PERMISSION'
  }
};

/**
 * Error classification result
 * @typedef {Object} ErrorClassification
 * @property {string} type - Error type identifier
 * @property {string} severity - Severity level
 * @property {boolean} autoFixable - Whether error can be auto-fixed
 * @property {string} suggestion - Human-readable suggestion
 * @property {string[]} commonFixes - List of common fixes
 * @property {string} category - Error category
 * @property {string} match - Matched pattern string
 * @property {Error} originalError - Original error object
 */

/**
 * Error Classifier
 */
export class ErrorClassifier {
  constructor(customPatterns = {}) {
    this.patterns = { ...ERROR_PATTERNS, ...customPatterns };
    this.classificationHistory = [];
  }

  /**
   * Analyze an error and determine its classification
   * @param {Error} error - Error to analyze
   * @returns {ErrorClassification} - Classification result
   */
  classify(error) {
    const errorString = error.stack || error.message || String(error);

    for (const [type, config] of Object.entries(this.patterns)) {
      const match = errorString.match(config.pattern);
      if (match) {
        const classification = {
          type,
          severity: config.severity,
          autoFixable: config.autoFixable,
          suggestion: config.suggestion(match),
          commonFixes: config.commonFixes || [],
          category: config.category || 'UNKNOWN',
          match: match[0],
          originalError: error
        };

        this.recordClassification(classification);
        return classification;
      }
    }

    // Unknown error
    const unknownClassification = {
      type: 'UNKNOWN',
      severity: SEVERITY.HIGH,
      autoFixable: false,
      suggestion: 'Error no catalogado. Revisar stack trace completo.',
      commonFixes: [
        'Buscar el error en Google/StackOverflow',
        'Revisar logs completos',
        'Reportar issue con stack trace'
      ],
      category: 'UNKNOWN',
      match: errorString.substring(0, 100),
      originalError: error
    };

    this.recordClassification(unknownClassification);
    return unknownClassification;
  }

  /**
   * Record classification for analytics
   * @param {ErrorClassification} classification
   */
  recordClassification(classification) {
    this.classificationHistory.push({
      timestamp: new Date().toISOString(),
      type: classification.type,
      severity: classification.severity,
      category: classification.category
    });

    // Keep only last 100 classifications
    if (this.classificationHistory.length > 100) {
      this.classificationHistory.shift();
    }
  }

  /**
   * Add custom error pattern
   * @param {string} type - Pattern identifier
   * @param {Object} config - Pattern configuration
   */
  addPattern(type, config) {
    this.patterns[type] = config;
    logger.info(`📋 Added custom error pattern: ${type}`);
  }

  /**
   * Remove a pattern
   * @param {string} type - Pattern to remove
   */
  removePattern(type) {
    delete this.patterns[type];
  }

  /**
   * Get classification statistics
   * @returns {Object} - Statistics by type and severity
   */
  getStats() {
    const stats = {
      byType: {},
      bySeverity: {},
      byCategory: {},
      total: this.classificationHistory.length
    };

    for (const entry of this.classificationHistory) {
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Check if error should be logged loudly or quietly
   * @param {ErrorClassification} classification
   * @returns {boolean}
   */
  isQuietError(classification) {
    return classification.severity === SEVERITY.LOW;
  }

  /**
   * Get patterns by category
   * @param {string} category - Category to filter
   * @returns {Object}
   */
  getPatternsByCategory(category) {
    return Object.entries(this.patterns)
      .filter(([_, config]) => config.category === category)
      .reduce((acc, [type, config]) => {
        acc[type] = config;
        return acc;
      }, {});
  }

  /**
   * Clear classification history
   */
  clearHistory() {
    this.classificationHistory = [];
  }
}

export default ErrorClassifier;
