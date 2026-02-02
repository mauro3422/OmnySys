/**
 * Schema Validator for Enhanced System Map
 *
 * Responsabilidad:
 * - Validar que el output de análisis semántico cumple con el schema
 * - Filtrar conexiones con confidence < threshold
 * - Validar tipos de datos
 * - Generar warnings si hay problemas
 *
 * @module schema-validator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load schema
const schemaPath = path.join(__dirname, '../../schema/enhanced-system-map.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

/**
 * Valida una conexión semántica
 * @param {object} connection - Conexión a validar
 * @param {number} minConfidence - Confidence mínima (0-1)
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateSemanticConnection(connection, minConfidence = 0.7) {
  const errors = [];

  // Required fields
  if (!connection.id) errors.push('Missing required field: id');
  if (!connection.type) errors.push('Missing required field: type');
  if (!connection.target) errors.push('Missing required field: target');
  if (!connection.reason) errors.push('Missing required field: reason');
  if (connection.confidence === undefined) errors.push('Missing required field: confidence');

  // Type validation
  const validTypes = ['shared_state', 'event_listener', 'callback', 'side_effect', 'global_access', 'mutation'];
  if (connection.type && !validTypes.includes(connection.type)) {
    errors.push(`Invalid type: ${connection.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Confidence validation
  if (connection.confidence !== undefined) {
    if (typeof connection.confidence !== 'number') {
      errors.push(`Invalid confidence type: ${typeof connection.confidence}. Must be number`);
    } else if (connection.confidence < 0 || connection.confidence > 1) {
      errors.push(`Invalid confidence value: ${connection.confidence}. Must be 0-1`);
    } else if (connection.confidence < minConfidence) {
      errors.push(`Low confidence: ${connection.confidence} < ${minConfidence}`);
    }
  }

  // Severity validation
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (connection.severity && !validSeverities.includes(connection.severity)) {
    errors.push(`Invalid severity: ${connection.severity}. Must be one of: ${validSeverities.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida side effects
 * @param {object} sideEffects - Side effects a validar
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateSideEffects(sideEffects) {
  const errors = [];

  const validKeys = [
    'hasGlobalAccess',
    'modifiesDOM',
    'makesNetworkCalls',
    'usesLocalStorage',
    'accessesWindow',
    'modifiesGlobalState',
    'hasEventListeners',
    'usesTimers'
  ];

  for (const key of Object.keys(sideEffects)) {
    if (!validKeys.includes(key)) {
      errors.push(`Invalid side effect key: ${key}`);
    }
    if (typeof sideEffects[key] !== 'boolean') {
      errors.push(`Invalid side effect value for ${key}: ${sideEffects[key]}. Must be boolean`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida risk score
 * @param {object} riskScore - Risk score a validar
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateRiskScore(riskScore) {
  const errors = [];

  if (!riskScore.total && riskScore.total !== 0) {
    errors.push('Missing required field: total');
  } else if (typeof riskScore.total !== 'number') {
    errors.push(`Invalid total type: ${typeof riskScore.total}. Must be number`);
  } else if (riskScore.total < 0 || riskScore.total > 10) {
    errors.push(`Invalid total value: ${riskScore.total}. Must be 0-10`);
  }

  if (riskScore.breakdown) {
    const validKeys = ['staticComplexity', 'semanticConnections', 'hotspotRisk', 'sideEffectRisk'];
    for (const key of Object.keys(riskScore.breakdown)) {
      if (!validKeys.includes(key)) {
        errors.push(`Invalid breakdown key: ${key}`);
      }
      const value = riskScore.breakdown[key];
      if (typeof value !== 'number' || value < 0 || value > 10) {
        errors.push(`Invalid breakdown value for ${key}: ${value}. Must be number 0-10`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un FileAnalysis completo
 * @param {object} fileAnalysis - Análisis de archivo
 * @param {object} options - Opciones de validación
 * @returns {object} - { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateFileAnalysis(fileAnalysis, options = {}) {
  const { minConfidence = 0.7, strict = false } = options;
  const errors = [];
  const warnings = [];

  // Required fields
  if (!fileAnalysis.path) errors.push('Missing required field: path');
  if (!fileAnalysis.imports) errors.push('Missing required field: imports');
  if (!fileAnalysis.exports) errors.push('Missing required field: exports');

  // Validate semantic connections
  if (fileAnalysis.semanticConnections) {
    for (const conn of fileAnalysis.semanticConnections) {
      const result = validateSemanticConnection(conn, minConfidence);
      if (!result.valid) {
        if (strict) {
          errors.push(...result.errors.map(e => `Connection ${conn.id}: ${e}`));
        } else {
          warnings.push(...result.errors.map(e => `Connection ${conn.id}: ${e}`));
        }
      }
    }
  }

  // Validate side effects
  if (fileAnalysis.sideEffects) {
    const result = validateSideEffects(fileAnalysis.sideEffects);
    if (!result.valid) {
      warnings.push(...result.errors.map(e => `Side effects: ${e}`));
    }
  }

  // Validate risk score
  if (fileAnalysis.riskScore) {
    const result = validateRiskScore(fileAnalysis.riskScore);
    if (!result.valid) {
      warnings.push(...result.errors.map(e => `Risk score: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Filtra conexiones por confidence
 * @param {array} connections - Array de conexiones
 * @param {number} minConfidence - Confidence mínima
 * @returns {object} - { filtered: array, removed: array }
 */
export function filterByConfidence(connections, minConfidence = 0.7) {
  const filtered = [];
  const removed = [];

  for (const conn of connections) {
    if (conn.confidence >= minConfidence) {
      filtered.push(conn);
    } else {
      removed.push(conn);
    }
  }

  return { filtered, removed };
}

/**
 * Filtra conexiones por severity
 * @param {array} connections - Array de conexiones
 * @param {array} allowedSeverities - Severities permitidas
 * @returns {object} - { filtered: array, removed: array }
 */
export function filterBySeverity(connections, allowedSeverities = ['high', 'critical']) {
  const filtered = [];
  const removed = [];

  for (const conn of connections) {
    const severity = conn.severity || 'medium';
    if (allowedSeverities.includes(severity)) {
      filtered.push(conn);
    } else {
      removed.push(conn);
    }
  }

  return { filtered, removed };
}

/**
 * Valida enhanced system map completo
 * @param {object} systemMap - System map a validar
 * @param {object} options - Opciones de validación
 * @returns {object} - { valid: boolean, errors: object, warnings: object, stats: object }
 */
export function validateEnhancedSystemMap(systemMap, options = {}) {
  const { minConfidence = 0.7, strict = false } = options;
  const results = {
    valid: true,
    errors: {},
    warnings: {},
    stats: {
      totalFiles: 0,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      totalConnections: 0,
      validConnections: 0,
      lowConfidenceConnections: 0
    }
  };

  // Validate metadata
  if (!systemMap.metadata) {
    results.valid = false;
    results.errors['_metadata'] = ['Missing metadata'];
  }

  // Validate files
  if (!systemMap.files) {
    results.valid = false;
    results.errors['_files'] = ['Missing files object'];
    return results;
  }

  results.stats.totalFiles = Object.keys(systemMap.files).length;

  for (const [filePath, fileAnalysis] of Object.entries(systemMap.files)) {
    const validation = validateFileAnalysis(fileAnalysis, options);

    if (!validation.valid) {
      results.valid = false;
      results.errors[filePath] = validation.errors;
      results.stats.filesWithErrors++;
    }

    if (validation.warnings.length > 0) {
      results.warnings[filePath] = validation.warnings;
      results.stats.filesWithWarnings++;
    }

    // Count connections
    if (fileAnalysis.semanticConnections) {
      results.stats.totalConnections += fileAnalysis.semanticConnections.length;

      for (const conn of fileAnalysis.semanticConnections) {
        if (conn.confidence >= minConfidence) {
          results.stats.validConnections++;
        } else {
          results.stats.lowConfidenceConnections++;
        }
      }
    }
  }

  return results;
}

/**
 * Genera reporte de validación
 * @param {object} validationResult - Resultado de validateEnhancedSystemMap
 * @returns {string} - Reporte formateado
 */
export function generateValidationReport(validationResult) {
  const lines = [];

  lines.push('=== Enhanced System Map Validation Report ===\n');

  // Stats
  lines.push('Statistics:');
  lines.push(`  Total files: ${validationResult.stats.totalFiles}`);
  lines.push(`  Files with errors: ${validationResult.stats.filesWithErrors}`);
  lines.push(`  Files with warnings: ${validationResult.stats.filesWithWarnings}`);
  lines.push(`  Total connections: ${validationResult.stats.totalConnections}`);
  lines.push(`  Valid connections: ${validationResult.stats.validConnections}`);
  lines.push(`  Low confidence: ${validationResult.stats.lowConfidenceConnections}\n`);

  // Overall result
  if (validationResult.valid) {
    lines.push('✅ Validation PASSED\n');
  } else {
    lines.push('❌ Validation FAILED\n');
  }

  // Errors
  if (Object.keys(validationResult.errors).length > 0) {
    lines.push('Errors:');
    for (const [file, errors] of Object.entries(validationResult.errors)) {
      lines.push(`  ${file}:`);
      for (const error of errors) {
        lines.push(`    - ${error}`);
      }
    }
    lines.push('');
  }

  // Warnings
  if (Object.keys(validationResult.warnings).length > 0) {
    lines.push('Warnings:');
    for (const [file, warnings] of Object.entries(validationResult.warnings)) {
      lines.push(`  ${file}:`);
      for (const warning of warnings) {
        lines.push(`    - ${warning}`);
      }
    }
  }

  return lines.join('\n');
}
