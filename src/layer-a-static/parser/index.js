/**
 * @fileoverview parser-v2/index.js
 *
 * Parser basado en Tree-sitter — drop-in replacement de parser/index.js.
 * Misma interfaz pública: parseFile(filePath, code) → FileInfo
 *
 * Ventajas sobre Babel:
 *  - scope-aware call tracking (resuelve closure/callback gap)
 *  - soporte multi-lenguaje vía grammars nativos
 *  - sin WASM (usa node-tree-sitter nativo)
 *
 * @module parser-v2
 */

// node-tree-sitter usa exports nativos
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';

import path from 'path';
import fs from 'fs/promises';
import { extractFileInfo } from './extractor.js';
import { createLogger } from '../../utils/logger.js';
import { parseWithPool } from './parser-pool.js';

const logger = createLogger('OmnySys:parser-v2');

// ─── Inicialización lazy ───────────────────────────────────────────────────

let _initialized = false;

/** Cache de lenguajes ya cargados */
const _languageCache = new Map();

/**
 * Inicializa el parser de Tree-sitter (solo una vez)
 */
function ensureInitialized() {
    if (_initialized) return;
    _initialized = true;
    logger.debug('✅ Tree-sitter native initialized');
}

/**
 * Obtiene el lenguaje para un archivo dado
 * @param {string} filePath
 * @returns {Object} Language
 */
function getLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (_languageCache.has(ext)) return _languageCache.get(ext);

    let language;
    if (ext === '.ts' || ext === '.tsx') {
        language = TypeScript[ext === '.tsx' ? 'tsx' : 'typescript'];
    } else {
        language = JavaScript.javascript;
    }
    
    _languageCache.set(ext, language);
    return language;
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Obtiene el árbol Tree-sitter para el código dado
 * @param {string} filePath - Ruta del archivo para determinar el lenguaje
 * @param {string} code - Código fuente
 * @returns {Promise<import('tree-sitter').Tree|null>}
 */
export async function getTree(filePath, code) {
    try {
        ensureInitialized();
        const language = getLanguage(filePath);
        if (!language) return null;

        // ✅ USAR POOL: Reutiliza parsers en vez de crear/destruir
        const tree = await parseWithPool(language, code, filePath);
        return tree;
    } catch (error) {
        logger.error(`Failed to get tree for ${filePath}: ${error.message}`);
        return null;
    }
}

/**
 * Parsea un archivo con Tree-sitter y extrae su FileInfo.
 * Drop-in replacement de parseFile() en parser/index.js.
 *
 * @param {string} filePath - Ruta absoluta del archivo
 * @param {string} code - Contenido del archivo
 * @returns {Promise<object>} FileInfo
 */
export async function parseFile(filePath, code) {
    const ext = path.extname(filePath).toLowerCase();
    const supportedExts = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'];
    
    if (!supportedExts.includes(ext)) {
        // Fallback: retornar estructura vacía para archivos no soportados
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
        // Devolver estructura vacía en vez de romper el pipeline
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
 *
 * @param {string} filePath - Ruta absoluta del archivo
 * @returns {Promise<object>} - FileInfo
 */
export async function parseFileFromDisk(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const code = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw; // strip UTF-8 BOM
        const fileInfo = await parseFile(filePath, code);
        fileInfo.source = code; // Guardar source para extractores downstream
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

/**
 * Versión síncrona disponible para compatibilidad.
 * Lanza error si el parser aún no fue inicializado.
 * Se recomienda usar parseFile() async siempre.
 *
 * @param {string} filePath
 * @param {string} code
 * @returns {object} FileInfo (puede estar incompleto si no inicializado)
 */
export function parseFileSync(filePath, code) {
    if (!_initialized) {
        throw new Error('parser-v2 not initialized. Call parseFile() (async) first.');
    }
    // Para uso síncrono, si ya está inicializado podemos parsear directamente
    // porque el parsing en sí (después de cargar el wasm) es síncrono
    // IMPORTANTE: extractFileInfo es síncrona, pero cargar lenguajes no.
    // Este método solo funcionará si el lenguaje del archivo ya está en cache.
    const wasmPath = getWasmPath(filePath);
    const language = _languageCache.get(wasmPath);
    if (!language) {
        throw new Error(`Language for ${filePath} not in cache. Use async parseFile() first.`);
    }

    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse(code);
    const result = extractFileInfo(tree, code, filePath);

    tree.delete(); // 🧹 FREE MEMORY

    return result;
}
