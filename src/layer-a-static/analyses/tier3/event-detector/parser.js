/**
 * @fileoverview parser.js
 * 
 * Configuración y creación del parser Babel
 * 
 * @module analyses/tier3/event-detector/parser
 */

import { parse } from '@babel/parser';
import { DEFAULT_BABEL_PLUGINS, DEFAULT_PARSER_OPTIONS } from './constants.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:parser');



/**
 * Obtiene plugins de Babel según extensión del archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} - Plugins a usar
 */
export function getBabelPlugins(filePath) {
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  
  const plugins = [...DEFAULT_BABEL_PLUGINS];
  
  if (isTypeScript) {
    plugins.push(['typescript', { isTSX: filePath.endsWith('.tsx') }]);
  }
  
  return plugins;
}

/**
 * Parsea código fuente a AST
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo (para detectar TypeScript)
 * @returns {Object|null} - AST o null si hay error
 */
export function parseCodeToAST(code, filePath) {
  try {
    const plugins = getBabelPlugins(filePath);
    
    return parse(code, {
      ...DEFAULT_PARSER_OPTIONS,
      plugins
    });
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
  const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
  return validExtensions.some(ext => filePath.endsWith(ext));
}
