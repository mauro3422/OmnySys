/**
 * @fileoverview parser-v2/index.js
 *
 * Parser basado en tree-sitter (nativo)
 * Usa grammars nativos instalados vía npm
 *
 * @module parser-v2
 */

import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import path from 'path';
import fs from 'fs/promises';
import { extractFileInfo } from './extractor.js';
import { getParserPool } from './parser-pool.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:parser-v2');

// ─── Inicialización lazy ───────────────────────────────────────────────────

let _initialized = false;
let _grammars = null;

/**
 * Inicializa los lenguajes nativos
 */
async function ensureInitialized() {
    if (_initialized) return _grammars;

    logger.debug('📚 Initializing node-tree-sitter...');

    _grammars = {
        '.js': JavaScript,
        '.jsx': JavaScript,
        '.mjs': JavaScript,
        '.cjs': JavaScript,
        '.ts': TypeScript.typescript, // Nota: tree-sitter-typescript exporta { typescript, tsx }
        '.tsx': TypeScript.tsx
    };

    logger.debug('✅ Native grammars ready');
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
 * @returns {Promise<Object|null>}
 */
/**
 * Obtiene el árbol Tree-sitter para el código dado, reutilizando un parser del pool.
 * @param {string} filePath
 * @param {string} code - Código fuente
 * @returns {Promise<Object|null>}
 */
export async function getTree(filePath, code) {
    try {
        const grammars = await ensureInitialized();
        const ext = path.extname(filePath).toLowerCase();
        const language = grammars[ext];
        if (!language) {
            logger.error(`❌ No grammar for ${filePath}`);
            return null;
        }

        // Reusar parser del pool (evita new Parser() por cada archivo)
        const pool = getParserPool(20);
        return pool.withParser((parser) => {
            parser.setLanguage(language);
            return parser.parse(code);
        });
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
        // En node-tree-sitter no existe .delete(), el GC se encarga
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
/**
 * Lee un archivo y lo parsea. Si se provee content, no hace I/O.
 * @param {string} filePath - Ruta absoluta del archivo
 * @param {string} [content] - Contenido ya leído (opcional, evita doble I/O)
 * @returns {Promise<object>} - FileInfo
 */
export async function parseFileFromDisk(filePath, content = null) {
    try {
        const raw = content ?? await fs.readFile(filePath, 'utf-8');
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
