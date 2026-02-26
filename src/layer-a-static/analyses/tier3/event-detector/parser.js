/**
 * @fileoverview parser.js
 * 
 * Configuración y creación del parser Babel
 * 
 * @module analyses/tier3/event-detector/parser
 */

import { createLogger } from '../../../../utils/logger.js';
import { getTree, isSupportedFile } from '../../../parser/index.js';

const logger = createLogger('OmnySys:event-parser-v2');


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
  return isSupportedFile(filePath);
}
