/**
 * @fileoverview parser-pool.js
 *
 * Pool de parsers Tree-sitter nativos para reutilización.
 * 
 * node-tree-sitter es mucho más estable que web-tree-sitter,
 * pero igual conviene reutilizar parsers para evitar overhead.
 *
 * @module parser-v2/parser-pool
 */

import { createLogger } from '../../utils/logger.js';
import Parser from 'tree-sitter';

const logger = createLogger('OmnySys:parser-pool');

/**
 * Pool simple de parsers nativos
 */
class ParserPool {
  constructor(size = 10) {
    this.size = size;
    this.parsers = [];
    this.available = [];
    this.inUse = new Set();
    this.initialized = false;
  }

  /**
   * Inicializa el pool con N parsers
   */
  async initialize() {
    if (this.initialized) return;

    logger.info(`🔧 Initializing parser pool with ${this.size} parsers...`);

    for (let i = 0; i < this.size; i++) {
      const parser = new Parser();
      this.parsers.push(parser);
      this.available.push(i);
    }

    this.initialized = true;
    logger.info(`✅ Parser pool ready (${this.size} parsers)`);
  }

  /**
   * Adquiere un parser disponible
   * @returns {Promise<{parser: Object, index: number}>}
   */
  async acquire() {
    if (!this.initialized) {
      await this.initialize();
    }

    // Si no hay disponibles, esperar
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const index = this.available.pop();
    this.inUse.add(index);

    return { parser: this.parsers[index], index };
  }

  /**
   * Libera un parser para reuso
   * @param {number} index - Índice del parser
   */
  release(index) {
    if (!this.inUse.has(index)) {
      return;
    }

    this.inUse.delete(index);
    this.available.push(index);
  }

  /**
   * Ejecuta una función con un parser del pool
   * @template T
   * @param {Function} fn - Función que recibe (parser, index)
   * @returns {Promise<T>}
   */
  async withParser(fn) {
    const { parser, index } = await this.acquire();
    try {
      return await fn(parser, index);
    } finally {
      this.release(index);
    }
  }

  /**
   * Limpia el pool
   */
  destroy() {
    for (const parser of this.parsers) {
      parser.delete();
    }
    this.parsers = [];
    this.available = [];
    this.inUse.clear();
    this.initialized = false;
  }
}

// Singleton global
let _globalPool = null;

/**
 * Obtiene o crea el pool global de parsers
 * @param {number|null} size - Tamaño del pool
 * @returns {ParserPool}
 */
export function getParserPool(size = null) {
  if (!_globalPool) {
    _globalPool = new ParserPool(size || 10);
  }
  return _globalPool;
}

/**
 * Parsea código usando el pool de parsers
 * @param {Object} language - Lenguaje cargado (tree-sitter-javascript, etc.)
 * @param {string} code - Código a parsear
 * @returns {Promise<import('tree-sitter').Tree>}
 */
export async function parseWithPool(language, code) {
  const pool = getParserPool(10);

  return pool.withParser(async (parser) => {
    parser.setLanguage(language);
    return parser.parse(code);
  });
}

export default ParserPool;
