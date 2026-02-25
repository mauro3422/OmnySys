/**
 * @fileoverview parser-v2/index.js
 *
 * Parser basado en Tree-sitter — drop-in replacement de parser/index.js.
 * Misma interfaz pública: parseFile(filePath, code) → FileInfo
 *
 * Ventajas sobre Babel:
 *  - scope-aware call tracking (resuelve closure/callback gap)
 *  - soporte multi-lenguaje vía grammars WASM
 *  - sin compilación nativa (usa web-tree-sitter WASM)
 *
 * @module parser-v2
 */

// web-tree-sitter usa named exports en ESM — no tiene default export
// Se resuelve dinámicamente en ensureInitialized()
let Parser;
let Language;

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { getWasmPath, WASM_DIR, isSupportedFile } from './grammars/index.js';
import { extractFileInfo } from './extractor.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:parser-v2');

// ─── Inicialización lazy ───────────────────────────────────────────────────

let _initialized = false;
let _initPromise = null;

/** Cache de lenguajes ya cargados: wasmPath → Language */
const _languageCache = new Map();

/**
 * Inicializa el motor WASM de Tree-sitter (solo una vez)
 */
async function ensureInitialized() {
    if (_initialized) return;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        // Importar dinámicamente — web-tree-sitter usa named exports en ESM
        const wts = await import('web-tree-sitter');
        Parser = wts.Parser;
        Language = wts.Language;  // Language es named export separado

        // fileURLToPath convierte URL → path absoluto Windows (C:\...\web-tree-sitter.wasm)
        const runtimeWasmPath = fileURLToPath(
            new URL('../../../node_modules/web-tree-sitter/web-tree-sitter.wasm', import.meta.url)
        );

        await Parser.init({
            locateFile(filename) {
                // web-tree-sitter internamente busca 'tree-sitter.wasm'
                // pero el archivo real se llama 'web-tree-sitter.wasm'
                if (filename.includes('tree-sitter.wasm')) {
                    return runtimeWasmPath;
                }
                return filename;
            }
        });
        _initialized = true;
        logger.debug('✅ Tree-sitter WASM initialized');
    })();

    return _initPromise;
}

/**
 * Carga (y cachea) el Language para un archivo dado
 * @param {string} filePath
 * @returns {Promise<import('web-tree-sitter').Language|null>}
 */
async function loadLanguage(filePath) {
    const wasmPath = getWasmPath(filePath);
    if (!wasmPath) return null;

    if (_languageCache.has(wasmPath)) return _languageCache.get(wasmPath);

    const lang = await Language.load(wasmPath);
    _languageCache.set(wasmPath, lang);
    return lang;
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
        await ensureInitialized();
        const language = await loadLanguage(filePath);
        if (!language) return null;

        const parser = new Parser();
        parser.setLanguage(language);
        return parser.parse(code);
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
    if (!isSupportedFile(filePath)) {
        // Fallback: retornar estructura vacía para archivos no soportados
        return {
            filePath,
            fileName: path.basename(filePath),
            ext: path.extname(filePath),
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

        return extractFileInfo(tree, code, filePath);

    } catch (error) {
        logger.error(`❌ parser-v2 failed for ${path.basename(filePath)}: ${error.message}`);
        // Devolver estructura vacía en vez de romper el pipeline
        return {
            filePath,
            fileName: path.basename(filePath),
            ext: path.extname(filePath),
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
    return extractFileInfo(tree, code, filePath);
}

export { isSupportedFile };
