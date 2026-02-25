/**
 * @fileoverview grammars/index.js
 *
 * Registry de grammars Tree-sitter por extensión de archivo.
 * Soporta JS, JSX, TS, TSX. Más lenguajes en Fase 4.
 *
 * @module parser-v2/grammars
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WASM_DIR = path.join(__dirname, 'wasm');

/**
 * Mapeo extensión → archivo .wasm del grammar
 */
export const GRAMMAR_MAP = {
    '.js': 'tree-sitter-javascript.wasm',
    '.jsx': 'tree-sitter-javascript.wasm',
    '.mjs': 'tree-sitter-javascript.wasm',
    '.cjs': 'tree-sitter-javascript.wasm',
    '.ts': 'tree-sitter-typescript.wasm',
    '.tsx': 'tree-sitter-typescript.wasm',
};

/**
 * Devuelve la ruta al .wasm correcto para un archivo dado
 * @param {string} filePath
 * @returns {string|null}
 */
export function getWasmPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const wasmFile = GRAMMAR_MAP[ext];
    if (!wasmFile) return null;
    return path.join(WASM_DIR, wasmFile);
}

/**
 * Retorna true si el archivo es soportado por el parser-v2
 * @param {string} filePath
 * @returns {boolean}
 */
export function isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext in GRAMMAR_MAP;
}
