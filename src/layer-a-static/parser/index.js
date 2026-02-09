/**
 * @fileoverview index.js
 * 
 * Parser modular - Parsea archivos y extrae información del AST
 * 
 * Responsabilidad:
 * - Generar AST con @babel/parser
 * - Extraer imports (qué y de dónde)
 * - Extraer exports (qué exporta)
 * - Extraer definiciones (funciones, clases)
 * - Extraer llamadas a funciones
 * 
 * @module parser
 */

import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

import { getParserOptions } from './config.js';
import { extractESMImport, extractCommonJSRequire, extractDynamicImport } from './extractors/imports.js';
import { extractNamedExports, extractDefaultExport } from './extractors/exports.js';
import { extractFunctionDefinition, extractClassDefinition, extractVariableExports } from './extractors/definitions.js';
import { extractTSInterface, extractTSTypeAlias, extractTSEnum, extractTSTypeReference } from './extractors/typescript.js';
import { extractCallExpression, extractIdentifierRef } from './extractors/calls.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:index');



// ============================================
// API Pública
// ============================================

export { getParserOptions } from './config.js';
export { getFileId, isNodeExported, isExportedFunction, findCallsInFunction } from './helpers.js';

/**
 * Parsea un archivo y extrae información
 *
 * @param {string} filePath - Ruta absoluta del archivo
 * @param {string} code - Contenido del archivo
 * @returns {object} - FileInfo con imports, exports, definitions
 */
export function parseFile(filePath, code) {
  const fileInfo = {
    filePath,
    fileName: path.basename(filePath),
    ext: path.extname(filePath),
    imports: [],
    exports: [],
    definitions: [],
    calls: [],
    functions: [],
    identifierRefs: [],
    // TIER 3: Deep static analysis
    typeDefinitions: [],
    enumDefinitions: [],
    constantExports: [],
    objectExports: [],
    typeUsages: []
  };

  try {
    const ast = parse(code, getParserOptions(filePath));

    traverse.default(ast, {
      // Import ESM
      ImportDeclaration(nodePath) {
        fileInfo.imports.push(extractESMImport(nodePath));
      },

      // Exports nombrados
      ExportNamedDeclaration(nodePath) {
        fileInfo.exports.push(...extractNamedExports(nodePath));
        
        // Si tiene declaración, procesarla
        const node = nodePath.node;
        if (node.declaration?.type === 'VariableDeclaration') {
          extractVariableExports(nodePath.get('declaration'), fileInfo);
        }
      },

      // Default export
      ExportDefaultDeclaration(nodePath) {
        fileInfo.exports.push(extractDefaultExport(nodePath));
      },

      // Funciones
      FunctionDeclaration(nodePath) {
        if (nodePath.node.id) {
          extractFunctionDefinition(nodePath, filePath, fileInfo);
        }
      },

      // Clases
      ClassDeclaration(nodePath) {
        extractClassDefinition(nodePath, fileInfo);
      },

      // TypeScript
      TSInterfaceDeclaration(nodePath) {
        extractTSInterface(nodePath, fileInfo);
      },

      TSTypeAliasDeclaration(nodePath) {
        extractTSTypeAlias(nodePath, fileInfo);
      },

      TSEnumDeclaration(nodePath) {
        extractTSEnum(nodePath, fileInfo);
      },

      TSTypeReference(nodePath) {
        extractTSTypeReference(nodePath, fileInfo);
      },

      // Llamadas y requires
      CallExpression(nodePath) {
        const node = nodePath.node;
        
        // Dynamic import
        const dynamicImport = extractDynamicImport(node);
        if (dynamicImport) {
          fileInfo.imports.push(dynamicImport);
          return;
        }
        
        // CommonJS require
        const commonjs = extractCommonJSRequire(node);
        if (commonjs) {
          fileInfo.imports.push(commonjs);
          return;
        }
        
        // Llamadas a funciones
        extractCallExpression(node, fileInfo);
      },

      // Identificadores
      Identifier(nodePath) {
        extractIdentifierRef(nodePath, fileInfo);
      }
    });

  } catch (error) {
    fileInfo.parseError = error.message;
    logger.warn(`⚠️  Parse error in ${filePath}: ${error.message}`);
  }

  return fileInfo;
}

/**
 * Lee un archivo y lo parsea
 *
 * @param {string} filePath - Ruta absoluta del archivo
 * @returns {Promise<object>} - FileInfo
 */
export async function parseFileFromDisk(filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf-8');
    return parseFile(filePath, code);
  } catch (error) {
    logger.error(`Error reading file ${filePath}:`, error);
    return {
      filePath,
      fileName: path.basename(filePath),
      ext: path.extname(filePath),
      imports: [],
      exports: [],
      definitions: [],
      calls: [],
      readError: error.message
    };
  }
}

/**
 * Parsea múltiples archivos en paralelo
 *
 * @param {string[]} filePaths - Array de rutas absolutas
 * @returns {Promise<object[]>} - Array de FileInfo
 */
export async function parseFiles(filePaths) {
  const promises = filePaths.map(filePath => parseFileFromDisk(filePath));
  return Promise.all(promises);
}
