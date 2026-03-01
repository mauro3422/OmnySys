/**
 * @fileoverview parser-v2/index.js
 *
 * Parser basado en web-tree-sitter 0.25.10
 * Usa grammars WASM pre-compilados
 *
 * @module parser-v2
 */

import * as Parser from 'web-tree-sitter';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { extractFileInfo } from './extractor.js';
import { createLogger } from '../../utils/logger.js';
import { parseWithPool } from './parser-pool.js';

const logger = createLogger('OmnySys:parser-v2');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Inicialización lazy ───────────────────────────────────────────────────

let _initialized = false;
let _grammars = null;

/**
 * Inicializa web-tree-sitter y carga grammars WASM
 */
async function ensureInitialized() {
  if (_initialized) return _grammars;
  
  logger.debug('📚 Initializing web-tree-sitter 0.25.10...');
  
  // Inicializar Parser con el WASM runtime
  await Parser.init();
  
  // Cargar grammars WASM desde el directorio local
  const wasmDir = path.join(__dirname, 'grammars', 'wasm');
  
  _grammars = {
    '.js': await Parser.Language.load(path.join(wasmDir, 'tree-sitter-javascript.wasm')),
    '.jsx': await Parser.Language.load(path.join(wasmDir, 'tree-sitter-javascript.wasm')),
    '.mjs': await Parser.Language.load(path.join(wasmDir, 'tree-sitter-javascript.wasm')),
    '.cjs': await Parser.Language.load(path.join(wasmDir, 'tree-sitter-javascript.wasm')),
    '.ts': await Parser.Language.load(path.join(wasmDir, 'tree-sitter-typescript.wasm')),
    '.tsx': await Parser.Language.load(path.join(wasmDir, 'tree-sitter-typescript.wasm'))
  };
  
  logger.debug('✅ Grammars loaded successfully');
  _initialized = true;
  return _grammars;
}

/**
 * Obtiene el lenguaje para un archivo dado
 * @param {string} filePath
 * @returns {Promise<Object|null>} Language
 */
async function getLanguage(filePath) {
  const grammars = await ensureInitialized();
  const ext = path.extname(filePath).toLowerCase();
  return grammars[ext] || null;
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Obtiene el árbol Tree-sitter para el código dado
 * @param {string} filePath - Ruta del archivo para determinar el lenguaje
 * @param {string} code - Código fuente
 * @returns {Promise<import('web-tree-sitter').Tree|null>}
 */
export async function getTree(filePath, code) {
    try {
        const language = await getLanguage(filePath);
        if (!language) {
          logger.error(`❌ No grammar for ${filePath}`);
          return null;
        }

        // ✅ USAR POOL: Reutiliza parsers en vez de crear/destruir
        const tree = await parseWithPool(language, code);
        return tree;
    } catch (error) {
        logger.error(`Failed to get tree for ${filePath}: ${error.message}`);
        return null;
    }
}

/**
 * Parsea un archivo con Tree-sitter y extrae su FileInfo.
 * @param {string} filePath - Ruta absoluta del archivo
 * @param {string} code - Contenido del archivo
 * @returns {Promise<object>} FileInfo
 */
export async function parseFile(filePath, code) {
    const ext = path.extname(filePath).toLowerCase();
    const supportedExts = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'];
    
    if (!supportedExts.includes(ext)) {
        return {
            filePath,
            fileName: path.basename(filePath),
            ext: ext,
            imports: [], exports: [], definitions: [],
            calls: [], functions: [], identifierRefs: [],
            typeDefinitions: [], enumDefinitions: [],
            constantExports: [], objectExports: [], typeUsages: [],
            _unsupported: true,
        };
    }

    try {
        const tree = await getTree(filePath, code);
        if (!tree) throw new Error(`Could not generate tree for: ${filePath}`);

        const result = extractFileInfo(tree, code, filePath);
        tree.delete(); // 🧹 FREE MEMORY
        return result;

    } catch (error) {
        logger.error(`❌ parser-v2 failed for ${path.basename(filePath)}: ${error.message}`);
        return {
            filePath,
            fileName: path.basename(filePath),
            ext: ext,
            imports: [], exports: [], definitions: [],
            calls: [], functions: [], identifierRefs: [],
            typeDefinitions: [], enumDefinitions: [],
            constantExports: [], objectExports: [], typeUsages: [],
            _error: error.message,
        };
    }
}

/**
 * Lee un archivo y lo parsea
 * @param {string} filePath - Ruta absoluta del archivo
 * @returns {Promise<object>} - FileInfo
 */
export async function parseFileFromDisk(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const code = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
        const fileInfo = await parseFile(filePath, code);
        fileInfo.source = code;
        return fileInfo;
    } catch (error) {
        logger.error(`Error reading file ${filePath}:`, error);
        return {
            filePath,
            fileName: path.basename(filePath),
            ext: path.extname(filePath),
            imports: [], exports: [], definitions: [],
            calls: [], functions: [],
            readError: error.message
        };
    }
}
