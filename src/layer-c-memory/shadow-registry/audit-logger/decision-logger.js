/**
 * @fileoverview Decision Audit Logger - Core Logging
 *
 * Maneja el logging de decisiones de auditoría.
 *
 * @module layer-c-memory/shadow-registry/audit-logger/decision-logger
 */

import fs from 'fs/promises';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:shadow:audit');

/**
 * Escribe una línea en el archivo de auditoría
 * @param {string} filePath - Ruta del archivo
 * @param {string} line - Línea a escribir
 * @returns {Promise<void>}
 */
export async function appendAuditLine(filePath, line) {
  try {
    await fs.appendFile(filePath, line);
  } catch (error) {
    logger.warn('⚠️ Failed to write audit line:', error.message);
  }
}

/**
 * Lee todas las líneas de un archivo de auditoría
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>} Líneas del archivo
 */
export async function readAuditFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Escribe todas las líneas en el archivo de auditoría
 * @param {string} filePath - Ruta del archivo
 * @param {string[]} lines - Líneas a escribir
 * @returns {Promise<void>}
 */
export async function writeAuditFile(filePath, lines) {
  try {
    await fs.writeFile(filePath, lines.join('\n') + '\n');
  } catch (error) {
    logger.warn('⚠️ Failed to write audit file:', error.message);
  }
}

/**
 * Crea un entry de auditoría
 * @param {Object} decision - Datos de la decisión
 * @param {string} decisionId - ID de la decisión
 * @returns {Object} Entry de auditoría
 */
export function createAuditEntry(decision, decisionId) {
  return {
    decisionId,
    type: decision.type,
    filePath: decision.filePath,
    timestamp: new Date().toISOString(),
    reason: decision.reason,
    confidence: decision.confidence ?? 1.0,
    context: decision.context || {},
    ruleId: decision.ruleId || null,
    llmModel: decision.llmModel || null,
    metadata: decision.metadata || null,
    previousState: decision.previousState || 'unknown',
    newState: decision.newState || 'unknown',
    overridden: false,
    overriddenBy: null,
    overrideReason: null
  };
}

export default {
  appendAuditLine,
  readAuditFile,
  writeAuditFile,
  createAuditEntry
};
