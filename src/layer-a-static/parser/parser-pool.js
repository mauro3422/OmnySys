/**
 * @fileoverview parser-pool.js
 * 
 * Pool de parsers nativos. 
 * Con node-tree-sitter no es estrictamente necesario un pool complejo,
 * pero mantenemos la abstracción para no romper el resto del pipeline.
 * 
 * @module parser-v2/parser-pool
 */

import Parser from 'tree-sitter';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:parser-pool');

class ParserPool {
  constructor(size = 5) {
    this.size = size;
    this.parsers = [];
    this.available = [];
    this.inUse = new Set();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    for (let i = 0; i < this.size; i++) {
      this.parsers.push(new Parser());
      this.available.push(i);
    }
    this.initialized = true;
  }

  async acquire() {
    if (!this.initialized) await this.initialize();
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    const index = this.available.pop();
    this.inUse.add(index);
    return { parser: this.parsers[index], index };
  }

  release(index) {
    this.inUse.delete(index);
    this.available.push(index);
  }

  async withParser(fn) {
    const { parser, index } = await this.acquire();
    try {
      return await fn(parser, index);
    } finally {
      this.release(index);
    }
  }

  destroy() {
    this.parsers = [];
    this.available = [];
    this.inUse.clear();
    this.initialized = false;
  }
}

let _globalPool = null;

export function getParserPool(size = null) {
  if (!_globalPool) {
    _globalPool = new ParserPool(size || 20);
  }
  return _globalPool;
}

export async function parseWithPool(language, code) {
  const pool = getParserPool();
  return pool.withParser(async (parser) => {
    parser.setLanguage(language);
    return parser.parse(code);
  });
}

export default ParserPool;
