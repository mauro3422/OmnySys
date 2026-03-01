/**
 * @fileoverview parser.js
 *
 * Configuración y creación del parser
 *
 * @module analyses/tier3/event-detector/parser
 */

import { createLogger } from '../../../../utils/logger.js';
import { getTree } from '../../../parser/index.js';
import path from 'path';

const logger = createLogger('OmnySys:event-parser-v2');

const SUPPORTED_EXTS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'];

/**
 * Parsea código fuente a AST usando Tree-sitter
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object|null>} - Tree o null si hay error
 */
export async function parseCodeToAST(code, filePath) {
  try {
    return await getTree(filePath, code);
  } catch (error) {
    logger.warn(`⚠️  Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Verifica si un archivo es parseable
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean}
 */
export function isParseableFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTS.includes(ext);
}
