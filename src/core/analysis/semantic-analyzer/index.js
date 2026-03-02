/**
 * @fileoverview Main entry point for the semantic analyzer core.
 */

import { JSSemanticProvider } from './providers/javascript.js';

class SemanticAnalyzerRegistry {
  constructor() {
    this.providers = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    this.registerProvider(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'], new JSSemanticProvider());
  }

  registerProvider(extensions, provider) {
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    exts.forEach(ext => this.providers.set(ext.toLowerCase(), provider));
  }

  getProvider(filePath) {
    if (!filePath) return null;
    const extMatch = filePath.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';
    return this.providers.get(ext) || null;
  }

  /**
   * Analyzes an atom semantically (sync).
   * JsAnalyzer is fully synchronous — no need for async/await.
   * @param {Object} atom - The atom to analyze.
   * @param {string} code - The source code of the atom.
   * @param {Object} options - Analysis options.
   * @returns {Object} Semantic metadata.
   */
  analyzeAtom(atom, code, options = {}) {
    const provider = this.getProvider(atom.filePath);
    if (!provider) {
      return {
        semantic: { error: 'No provider for this file type' }
      };
    }

    try {
      const results = provider.analyze(atom, code, options);
      return { semantic: results };
    } catch (error) {
      return {
        semantic: { error: error.message }
      };
    }
  }
}

export const semanticAnalyzer = new SemanticAnalyzerRegistry();
export default semanticAnalyzer;
